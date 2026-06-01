import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  createProductVariantsWorkflow,
  linkProductsToSalesChannelWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

import productEventGroupLink from "../../links/product-event-group"
import variantEventItemLink from "../../links/variant-event-item"
import { applyCityToEventItemPatch } from "../../lib/resolve-city"
import EventsModuleService from "../events/service"
import CatalogModuleService from "../catalog/service"
import type { SfCourseProductShape } from "./mappings/course-product"
import {
  courseProductAvailableQuantity,
  courseProductOptionLabel,
  courseProductPriceAmount,
  courseProductVariantTitle,
  inferDeliveryType,
} from "./mappings/course-product"
import type { SfProductgroupShape } from "./mappings/productgroup"
import {
  mapSalesforceRecordType,
  parseProductgroupSubjects,
  productgroupGalleryUrls,
  productgroupMetadataFromSalesforce,
  stripHtmlToPlainText,
} from "./mappings/productgroup"
import SalesforceSyncModuleService from "./service"
import { linkProductCategoriesByLabels } from "./utils/resolve-category-by-label"
import { resolveDefaultSalesChannelId } from "./utils/resolve-default-sales-channel-id"
import { linkNativeProductCategoriesByLabels } from "./utils/resolve-native-categories-by-label"
import { resolveProductTypeId } from "./utils/resolve-product-type-id"
import { shouldImportProductgroup } from "./utils/future-import-guard"
import { syncProductById } from "../sanity-sync/sync-product-by-id"
import { linkDocentFromSalesforce } from "./utils/link-docent-from-salesforce"
import { buildVathuisMetadata } from "./utils/vathuis-metadata"

const INCOMING_LOCK_MS = 10_000
const ENTITY_PRODUCTGROUP = "productgroup"
const ENTITY_VARIANT = "variant"

export type ImportProductgroupInput = {
  salesforceId: string
  groupRecord: Record<string, unknown>
  childRecords: Record<string, unknown>[]
  manual?: boolean
}

export type ImportProductgroupResult = {
  medusaId: string
  created: boolean
  updated: boolean
  skipped?: boolean
  skipReason?: string
  variantIds: string[]
}

async function upsertIncomingLockBySalesforceId(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  entityType: string,
  medusaId: string,
  salesforceId: string
): Promise<void> {
  const until = new Date(Date.now() + INCOMING_LOCK_MS)
  const bySf = await sync.getStateBySalesforceId(entityType, salesforceId)
  if (bySf) {
    await sync.updateSalesforceSyncStates({
      id: bySf.id,
      medusa_id: medusaId,
      salesforce_id: salesforceId,
      incoming_lock_until: until,
      last_status: "retrying",
    })
    return
  }
  let row = await sync.getStateByMedusaId(entityType, medusaId)
  if (!row) {
    await sync.createSalesforceSyncStates([
      {
        entity_type: entityType,
        medusa_id: medusaId,
        salesforce_id: salesforceId,
        incoming_lock_until: until,
        last_status: "retrying",
      },
    ])
    return
  }
  await sync.updateSalesforceSyncStates({
    id: row.id,
    salesforce_id: salesforceId,
    incoming_lock_until: until,
    last_status: "retrying",
  })
}

async function resolveDefaultShippingProfileId(container: MedusaContainer): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: { entity: string; fields: string[] }) => Promise<{ data?: { id?: string }[] }>
  }
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const id = profiles?.[0]?.id
  if (!id) {
    throw new Error(
      "No shipping profile found. Create a default shipping profile in Medusa Admin before importing product groups."
    )
  }
  return id
}

async function ensureProductInDefaultSalesChannel(
  container: MedusaContainer,
  productId: string
): Promise<void> {
  const salesChannelId = await resolveDefaultSalesChannelId(container)
  await linkProductsToSalesChannelWorkflow(container).run({
    input: { id: salesChannelId, add: [productId] },
  })
}

async function ensureEventGroup(
  container: MedusaContainer,
  productId: string,
  recordType: ReturnType<typeof mapSalesforceRecordType>,
  showInPlp: boolean
): Promise<void> {
  const events = container.resolve("events") as InstanceType<typeof EventsModuleService>
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["*", "event_group.*"],
    filters: { product_id: productId },
  })
  const row = existing?.[0] as { event_group?: { id: string } } | undefined

  if (row?.event_group?.id) {
    await events.updateEventGroups({
      id: row.event_group.id,
      record_type: recordType,
      show_in_plp: showInPlp,
    })
    return
  }

  const eventGroup = await events.createEventGroups({
    record_type: recordType,
    has_free_trial: false,
    show_in_plp: showInPlp,
  })
  if (!eventGroup?.id) throw new Error("Failed to create event group")

  await link.create({
    [Modules.PRODUCT]: { product_id: productId },
    events: { event_group_id: eventGroup.id },
  })
}

async function upsertEventItemForVariant(
  container: MedusaContainer,
  variantId: string,
  child: SfCourseProductShape,
  groupRecordType?: string | null
): Promise<void> {
  const events = container.resolve("events") as InstanceType<typeof EventsModuleService>
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  const delivery = inferDeliveryType(child, groupRecordType)
  const qty = courseProductAvailableQuantity(child)
  const isVathuis = delivery === "pre_recorded"
  const startAt =
    isVathuis || !child.Start_date_time__c ? null : new Date(child.Start_date_time__c)
  const endAt =
    isVathuis || !child.End_date_time__c ? null : new Date(child.End_date_time__c)
  const cityFields = child.Product_City__c
    ? await applyCityToEventItemPatch(catalog, child.Product_City__c)
    : { city: null, city_slug: null }

  const { data: existing } = await query.graph({
    entity: variantEventItemLink.entryPoint,
    fields: ["*", "event_item.*"],
    filters: { product_variant_id: variantId },
  })
  const row = existing?.[0] as { event_item?: { id: string } } | undefined

  if (row?.event_item?.id) {
    await events.updateEventItems({
      id: row.event_item.id,
      delivery_type: delivery,
      available_quantity: qty,
      start_at: startAt,
      end_at: endAt,
      city: cityFields.city,
      city_slug: cityFields.city_slug,
      is_free_trial: !!child.Free_Product__c,
    })
  } else {
    const eventItem = await events.createEventItems({
      delivery_type: delivery,
      available_quantity: qty,
      start_at: startAt,
      end_at: endAt,
      city: cityFields.city,
      city_slug: cityFields.city_slug,
      is_free_trial: !!child.Free_Product__c,
    })
    if (!eventItem?.id) throw new Error("Failed to create event item")
    await link.create({
      [Modules.PRODUCT]: { product_variant_id: variantId },
      events: { event_item_id: eventItem.id },
    })
  }

  await productModule.updateProductVariants(variantId, { manage_inventory: false })
}

async function upsertVariantSyncState(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  medusaId: string,
  salesforceId: string
): Promise<void> {
  let row = await sync.getStateByMedusaId(ENTITY_VARIANT, medusaId)
  if (!row) {
    await sync.createSalesforceSyncStates([
      {
        entity_type: ENTITY_VARIANT,
        medusa_id: medusaId,
        salesforce_id: salesforceId,
        last_status: "success",
      },
    ])
    return
  }
  await sync.updateSalesforceSyncStates({
    id: row.id,
    salesforce_id: salesforceId,
    last_status: "success",
  })
}

async function syncChildVariant(
  container: MedusaContainer,
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  productId: string,
  child: SfCourseProductShape,
  optionName: string,
  groupRecordType?: string | null
): Promise<string> {
  const sfId = child.Id!
  const existing = await sync.getStateBySalesforceId(ENTITY_VARIANT, sfId)
  const priceAmount = courseProductPriceAmount(child)
  const optionLabel = courseProductOptionLabel(child)
  const title = courseProductVariantTitle(child)
  const sku = `sf-${sfId}`

  if (existing?.medusa_id) {
    await upsertIncomingLockBySalesforceId(sync, ENTITY_VARIANT, existing.medusa_id, sfId)
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            id: existing.medusa_id,
            title,
            sku,
            prices: [{ amount: priceAmount, currency_code: "eur" }],
            manage_inventory: false,
            options: { [optionName]: optionLabel },
          },
        ],
      },
    })
    await upsertEventItemForVariant(container, existing.medusa_id, child, groupRecordType)
    return existing.medusa_id
  }

  const variantId = generateEntityId(undefined, "variant")
  await upsertIncomingLockBySalesforceId(sync, ENTITY_VARIANT, variantId, sfId)

  const { result } = await createProductVariantsWorkflow(container).run({
    input: {
      product_variants: [
        {
          product_id: productId,
          title,
          sku,
          manage_inventory: false,
          prices: [{ amount: priceAmount, currency_code: "eur" }],
          options: { [optionName]: optionLabel },
        },
      ],
    },
  })

  const createdVariantId = result?.[0]?.id ?? variantId
  await upsertEventItemForVariant(container, createdVariantId, child, groupRecordType)
  await upsertVariantSyncState(sync, createdVariantId, sfId)
  return createdVariantId
}

export async function importProductgroupFromSalesforce(
  container: MedusaContainer,
  input: ImportProductgroupInput
): Promise<ImportProductgroupResult> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const group = input.groupRecord as SfProductgroupShape
  const children = input.childRecords as SfCourseProductShape[]

  if (!shouldImportProductgroup({ group, children, manual: input.manual })) {
    return {
      medusaId: "",
      created: false,
      updated: false,
      skipped: true,
      skipReason: "past_dates",
      variantIds: [],
    }
  }

  const title = group.Name?.trim() || `Product group ${input.salesforceId}`
  const handle = group.Productgroup_URL__c?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const description = stripHtmlToPlainText(group.Productgroup_Description__c) || undefined
  const thumbnail = group.Primary_1_Url__c?.trim() || undefined
  const images = productgroupGalleryUrls(group).map((url) => ({ url }))
  const recordType = mapSalesforceRecordType(group.Productgroup_Record_Type_Developer_Name__c)
  const subjects = parseProductgroupSubjects(group)
  const baseMetadata = productgroupMetadataFromSalesforce(group, null)
  const bundleChild = children[0]
  const vathuisMetadata =
    bundleChild != null
      ? await buildVathuisMetadata({ group, bundleChild })
      : null
  const metadata = {
    ...baseMetadata,
    ...(vathuisMetadata ? { vathuis: vathuisMetadata } : {}),
  }
  const showInPlp = false

  const linked = await sync.getStateBySalesforceId(ENTITY_PRODUCTGROUP, input.salesforceId)
  let productId: string | null = linked?.medusa_id ?? null

  if (productId) {
    const productModule = container.resolve(Modules.PRODUCT)
    try {
      await productModule.retrieveProduct(productId)
    } catch {
      productId = null
    }
  }

  const shippingProfileId = await resolveDefaultShippingProfileId(container)
  const optionName = "Sessie"
  const optionValues = children.map((c) => courseProductOptionLabel(c))
  const typeId = await resolveProductTypeId(
    container,
    group.Productgroup_Record_Type_Developer_Name__c
  )

  let created = false
  let updated = false

  if (productId) {
    await upsertIncomingLockBySalesforceId(sync, ENTITY_PRODUCTGROUP, productId, input.salesforceId)
    await upsertIncomingLockBySalesforceId(sync, "product", productId, input.salesforceId)
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: [productId] },
        update: {
          title,
          handle,
          description,
          thumbnail,
          images,
          status: ProductStatus.PUBLISHED,
          metadata,
          type_id: typeId,
        },
      },
    })
    updated = true
  } else {
    productId = generateEntityId(undefined, "prod")
    await upsertIncomingLockBySalesforceId(sync, ENTITY_PRODUCTGROUP, productId, input.salesforceId)
    await upsertIncomingLockBySalesforceId(sync, "product", productId, input.salesforceId)

    const variantPayload =
      children.length > 0
        ? children.map((child) => ({
            title: courseProductVariantTitle(child),
            sku: `sf-${child.Id}`,
            manage_inventory: false,
            prices: [{ amount: courseProductPriceAmount(child), currency_code: "eur" as const }],
            options: { [optionName]: courseProductOptionLabel(child) },
          }))
        : [
            {
              title,
              sku: `sf-group-${input.salesforceId}`,
              manage_inventory: false,
              prices: [
                {
                  amount: Number(group.Productgroup_Price__c ?? 0),
                  currency_code: "eur" as const,
                },
              ],
              options: { [optionName]: "Default" },
            },
          ]

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: productId,
            title,
            handle,
            description,
            thumbnail,
            images,
            status: ProductStatus.PUBLISHED,
            metadata,
            type_id: typeId ?? undefined,
            shipping_profile_id: shippingProfileId,
            options: [
              {
                title: optionName,
                values: optionValues.length ? optionValues : ["Default"],
              },
            ],
            variants: variantPayload,
          },
        ],
      },
    })
    created = true
  }

  await ensureEventGroup(container, productId, recordType, showInPlp)
  await ensureProductInDefaultSalesChannel(container, productId)
  await linkNativeProductCategoriesByLabels(container, productId, subjects)
  await linkProductCategoriesByLabels(container, productId, subjects)
  await linkDocentFromSalesforce(container, productId, group, bundleChild ?? children[0] ?? null)

  const variantIds: string[] = []

  if (created && children.length > 0) {
    const productModule = container.resolve(Modules.PRODUCT)
    const product = await productModule.retrieveProduct(productId, { relations: ["variants"] })
    const variants = product.variants ?? []

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (!child.Id) continue
      const variant =
        variants.find((v) => v.sku === `sf-${child.Id}`) ??
        variants[i]
      if (!variant?.id) continue

      await upsertVariantSyncState(sync, variant.id, child.Id)
      await upsertEventItemForVariant(container, variant.id, child, group.Productgroup_Record_Type_Developer_Name__c)
      variantIds.push(variant.id)
    }
  } else {
    for (const child of children) {
      if (!child.Id) continue
      const variantId = await syncChildVariant(
        container,
        sync,
        productId,
        child,
        optionName,
        group.Productgroup_Record_Type_Developer_Name__c
      )
      variantIds.push(variantId)
    }
  }

  const now = new Date()
  let pgRow = await sync.getStateByMedusaId(ENTITY_PRODUCTGROUP, productId)
  if (!pgRow) {
    await sync.createSalesforceSyncStates([
      {
        entity_type: ENTITY_PRODUCTGROUP,
        medusa_id: productId,
        salesforce_id: input.salesforceId,
        last_pulled_at: now,
        last_status: "success",
      },
    ])
  } else {
    await sync.updateSalesforceSyncStates({
      id: pgRow.id,
      salesforce_id: input.salesforceId,
      last_pulled_at: now,
      last_status: "success",
      last_error: null,
    })
  }

  await syncProductById(productId, container).catch(() => undefined)

  return { medusaId: productId, created, updated, variantIds }
}
