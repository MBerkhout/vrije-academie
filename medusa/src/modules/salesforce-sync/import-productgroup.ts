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
  sanitizeProductHandle,
  stripHtmlToPlainText,
} from "./mappings/productgroup"
import SalesforceSyncModuleService from "./service"
import { linkProductCategoriesByLabels } from "./utils/resolve-category-by-label"
import { resolveDefaultSalesChannelId } from "./utils/resolve-default-sales-channel-id"
import { linkNativeProductCategoriesByLabels } from "./utils/resolve-native-categories-by-label"
import { resolveProductTypeId } from "./utils/resolve-product-type-id"
import { shouldImportProductgroup } from "./utils/future-import-guard"
import {
  findParentProductgroupIdsForLinkedOnlineSlave,
  mergeProductgroupChildRows,
  variantSkuForChild,
  variantSyncSalesforceId,
} from "./utils/linked-online-productgroup"
import type { BulkImportContext } from "./utils/import-context"
import { productgroupImportFingerprint } from "./utils/productgroup-fingerprint"
import { syncProductById } from "../sanity-sync/sync-product-by-id"
import {
  linkDocentFromSalesforce,
  resolveInstructorFromChild,
} from "./utils/link-docent-from-salesforce"
import { resolveEventItemFacetIdsFromSalesforce } from "./utils/link-event-item-facets-from-salesforce"
import { buildVathuisMetadata } from "./utils/vathuis-metadata"
import { deepEqual, sameDate } from "./utils/deep-equal"

const INCOMING_LOCK_MS = 10_000
const ENTITY_PRODUCTGROUP = "productgroup"
const ENTITY_VARIANT = "variant"

export type ImportProductgroupInput = {
  salesforceId: string
  groupRecord: Record<string, unknown>
  childRecords: Record<string, unknown>[]
  linkedGroupRecord?: Record<string, unknown> | null
  linkedChildRecords?: Record<string, unknown>[]
  manual?: boolean
  /** Bulk CLI: defer search reindex until after the batch. */
  skipSearch?: boolean
  /** Bulk CLI: defer Sanity mirror until batched sync after import pool. */
  skipSanitySync?: boolean
  /** Shared caches + coordination for bulk import runs. */
  importContext?: BulkImportContext
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

async function ensureProductSessionOptionValues(
  container: MedusaContainer,
  productId: string,
  optionName: string,
  values: string[]
): Promise<void> {
  if (!values.length) return
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: {
      entity: string
      fields: string[]
      filters?: Record<string, unknown>
    }) => Promise<{ data?: Record<string, unknown>[] }>
  }

  const { data: optionRows } = await query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.id", "values.value"],
    filters: { product_id: productId, title: optionName },
  })
  const option = optionRows?.[0] as
    | { id?: string; values?: { value?: string }[] }
    | undefined
  if (!option?.id) return

  const existingValues = (option.values ?? [])
    .map((v) => v.value)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
  const existing = new Set(existingValues)
  const missing = [...new Set(values)].filter((v) => !existing.has(v))
  if (!missing.length) return

  const productModule = container.resolve(Modules.PRODUCT) as unknown as {
    createProductOptionValues?: (
      data: { option_id: string; value: string }[]
    ) => Promise<unknown>
  }

  if (typeof productModule.createProductOptionValues === "function") {
    await productModule.createProductOptionValues(
      missing.map((value) => ({ option_id: option.id!, value }))
    )
    return
  }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: [productId] },
      update: {
        options: [
          {
            title: optionName,
            values: [...existingValues, ...missing],
          },
        ],
      },
    },
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
  productId: string,
  importContext?: BulkImportContext
): Promise<void> {
  if (importContext?.isProductLinkedToSalesChannel(productId)) return
  const salesChannelId = importContext
    ? await importContext.getSalesChannelId(container)
    : await resolveDefaultSalesChannelId(container)
  await linkProductsToSalesChannelWorkflow(container).run({
    input: { id: salesChannelId, add: [productId] },
  })
  importContext?.markProductLinkedToSalesChannel(productId)
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
    const existing = row.event_group as {
      id: string
      record_type?: string
      show_in_plp?: boolean
    }
    if (existing.record_type === recordType && existing.show_in_plp === showInPlp) {
      return
    }
    await events.updateEventGroups({
      id: existing.id,
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
  group: SfProductgroupShape,
  groupRecordType?: string | null,
  importContext?: BulkImportContext
): Promise<void> {
  const events = container.resolve("events") as InstanceType<typeof EventsModuleService>
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  const delivery = inferDeliveryType(child, groupRecordType)
  const qty = courseProductAvailableQuantity(child, groupRecordType)
  const isVathuis = delivery === "pre_recorded"
  const startAt =
    isVathuis || !child.Start_date_time__c ? null : new Date(child.Start_date_time__c)
  const endAt =
    isVathuis || !child.End_date_time__c ? null : new Date(child.End_date_time__c)
  const cityFields =
    delivery === "offline" && child.Product_City__c
      ? await applyCityToEventItemPatch(catalog, child.Product_City__c)
      : { city: null, city_slug: null }

  const instructor = resolveInstructorFromChild(group, child)
  const locationName = child.Product_Location_Name__c?.trim() || null
  const facetIds = await resolveEventItemFacetIdsFromSalesforce(
    container,
    child,
    group,
    groupRecordType,
    importContext
  )
  const patch = {
    delivery_type: delivery,
    available_quantity: qty,
    start_at: startAt,
    end_at: endAt,
    city: cityFields.city,
    city_slug: cityFields.city_slug,
    location_name: locationName,
    is_free_trial: !!child.Free_Product__c,
    instructor_name: instructor.name,
    instructor_salesforce_id: instructor.salesforceId,
    catalog_city_id: facetIds.catalog_city_id,
    catalog_location_id: facetIds.catalog_location_id,
    docent_id: facetIds.docent_id,
  }

  const { data: existing } = await query.graph({
    entity: variantEventItemLink.entryPoint,
    fields: ["*", "event_item.*"],
    filters: { product_variant_id: variantId },
  })
  const row = existing?.[0] as { event_item?: Record<string, unknown> } | undefined
  const existingItem = row?.event_item

  if (existingItem?.id) {
    const unchanged =
      existingItem.delivery_type === patch.delivery_type &&
      existingItem.available_quantity === patch.available_quantity &&
      sameDate(existingItem.start_at as string | Date | null, patch.start_at) &&
      sameDate(existingItem.end_at as string | Date | null, patch.end_at) &&
      existingItem.city === patch.city &&
      existingItem.city_slug === patch.city_slug &&
      existingItem.location_name === patch.location_name &&
      existingItem.is_free_trial === patch.is_free_trial &&
      existingItem.instructor_name === patch.instructor_name &&
      existingItem.instructor_salesforce_id === patch.instructor_salesforce_id &&
      existingItem.catalog_city_id === patch.catalog_city_id &&
      existingItem.catalog_location_id === patch.catalog_location_id &&
      existingItem.docent_id === patch.docent_id

    if (!unchanged) {
      await events.updateEventItems({
        id: existingItem.id as string,
        ...patch,
      })
    }
  } else {
    const eventItem = await events.createEventItems(patch)
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

async function resolveVariantForChildOnProduct(
  container: MedusaContainer,
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  productId: string,
  variantSyncKey: string,
  importContext?: BulkImportContext,
  skuFallback?: string
): Promise<{ medusaId: string } | null> {
  const cachedMedusaId = importContext?.getVariantMedusaId(variantSyncKey) ?? null
  let medusaIdFromState =
    cachedMedusaId ??
    (await sync.getStateBySalesforceId(ENTITY_VARIANT, variantSyncKey))?.medusa_id ??
    null

  const productModule = container.resolve(Modules.PRODUCT)

  if (!medusaIdFromState && skuFallback) {
    try {
      const product = await productModule.retrieveProduct(productId, { relations: ["variants"] })
      const variant = product.variants?.find((v) => v.sku === skuFallback)
      if (variant?.id) {
        medusaIdFromState = variant.id
        importContext?.setVariantMedusaId(variantSyncKey, variant.id)
      }
    } catch {
      /* product missing */
    }
  }

  if (!medusaIdFromState) return null

  try {
    const variant = await productModule.retrieveProductVariant(medusaIdFromState, {
      select: ["id", "product_id"],
    })
    if (variant.product_id === productId) {
      importContext?.setVariantMedusaId(variantSyncKey, medusaIdFromState)
      return { medusaId: medusaIdFromState }
    }
  } catch {
    /* variant removed — recreate below */
  }
  return null
}

async function syncChildVariantsBatch(
  container: MedusaContainer,
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  productId: string,
  productgroupSfId: string,
  childRows: Array<{ child: SfCourseProductShape; groupRecordType?: string | null }>,
  group: SfProductgroupShape,
  optionName: string,
  isLinkedOnlineSlave: boolean,
  importContext?: BulkImportContext
): Promise<string[]> {
  const variantIds: string[] = []
  const variantUpdates: Array<{
    id: string
    title: string
    sku: string
    prices: { amount: number; currency_code: string }[]
    manage_inventory: boolean
    options: Record<string, string>
  }> = []
  const variantsToCreate: Array<{
    child: SfCourseProductShape
    groupRecordType?: string | null
    variantSyncKey: string
    title: string
    sku: string
    priceAmount: number
    optionLabel: string
  }> = []
  const eventItemTasks: Array<{
    variantId: string
    child: SfCourseProductShape
    groupRecordType?: string | null
  }> = []

  for (const { child, groupRecordType } of childRows) {
    if (!child.Id) continue
    const sfId = child.Id
    const variantSyncKey = variantSyncSalesforceId(sfId, productgroupSfId, { isLinkedOnlineSlave })
    const sku = variantSkuForChild(sfId, { isLinkedOnlineSlave })
    const resolved = await resolveVariantForChildOnProduct(
      container,
      sync,
      productId,
      variantSyncKey,
      importContext,
      sku
    )
    const priceAmount = courseProductPriceAmount(child)
    const optionLabel = courseProductOptionLabel(child)
    const title = courseProductVariantTitle(child)

    if (resolved?.medusaId) {
      const existingMedusaId = resolved.medusaId
      await upsertIncomingLockBySalesforceId(sync, ENTITY_VARIANT, existingMedusaId, variantSyncKey)
      variantUpdates.push({
        id: existingMedusaId,
        title,
        sku,
        prices: [{ amount: priceAmount, currency_code: "eur" }],
        manage_inventory: false,
        options: { [optionName]: optionLabel },
      })
      eventItemTasks.push({ variantId: existingMedusaId, child, groupRecordType })
      variantIds.push(existingMedusaId)
    } else {
      variantsToCreate.push({
        child,
        groupRecordType,
        variantSyncKey,
        title,
        sku,
        priceAmount,
        optionLabel,
      })
    }
  }

  if (variantUpdates.length) {
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: variantUpdates },
    })
  }

  if (variantsToCreate.length) {
    const { result } = await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: variantsToCreate.map((v) => ({
          product_id: productId,
          title: v.title,
          sku: v.sku,
          manage_inventory: false,
          prices: [{ amount: v.priceAmount, currency_code: "eur" }],
          options: { [optionName]: v.optionLabel },
        })),
      },
    })

    for (let i = 0; i < variantsToCreate.length; i++) {
      const spec = variantsToCreate[i]
      const createdVariantId = result?.[i]?.id
      if (!createdVariantId) continue
      await upsertVariantSyncState(sync, createdVariantId, spec.variantSyncKey)
      importContext?.setVariantMedusaId(spec.variantSyncKey, createdVariantId)
      eventItemTasks.push({
        variantId: createdVariantId,
        child: spec.child,
        groupRecordType: spec.groupRecordType,
      })
      variantIds.push(createdVariantId)
    }
  }

  for (const task of eventItemTasks) {
    await upsertEventItemForVariant(
      container,
      task.variantId,
      task.child,
      group,
      task.groupRecordType,
      importContext
    )
  }

  return variantIds
}

/** Re-apply session location/docent fields from Salesforce without touching product metadata. */
export async function refreshEventItemsFromChildRows(
  container: MedusaContainer,
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  productId: string,
  productgroupSfId: string,
  childRows: Array<{ child: SfCourseProductShape; groupRecordType?: string | null }>,
  group: SfProductgroupShape,
  isLinkedOnlineSlave: boolean,
  importContext?: BulkImportContext
): Promise<string[]> {
  const variantIds: string[] = []

  for (const { child, groupRecordType } of childRows) {
    if (!child.Id) continue
    const variantSyncKey = variantSyncSalesforceId(child.Id, productgroupSfId, {
      isLinkedOnlineSlave,
    })
    const sku = variantSkuForChild(child.Id, { isLinkedOnlineSlave })
    const resolved = await resolveVariantForChildOnProduct(
      container,
      sync,
      productId,
      variantSyncKey,
      importContext,
      sku
    )
    if (!resolved?.medusaId) continue

    await upsertEventItemForVariant(
      container,
      resolved.medusaId,
      child,
      group,
      groupRecordType,
      importContext
    )
    variantIds.push(resolved.medusaId)
  }

  return variantIds
}

function productUpdateNeedsApply(
  existing: {
    title?: string
    handle?: string
    description?: string | null
    thumbnail?: string | null
    images?: { url?: string }[]
    metadata?: Record<string, unknown> | null
    type_id?: string | null
  },
  update: {
    title: string
    handle: string
    description?: string
    thumbnail?: string
    images: { url: string }[]
    metadata: Record<string, unknown>
    typeId: string | null
  }
): boolean {
  const existingImageUrls = (existing.images ?? [])
    .map((img) => img.url)
    .filter(Boolean)
    .sort()
  const nextImageUrls = update.images.map((img) => img.url).sort()

  return (
    existing.title !== update.title ||
    existing.handle !== update.handle ||
    (existing.description ?? undefined) !== update.description ||
    (existing.thumbnail ?? undefined) !== update.thumbnail ||
    !deepEqual(existingImageUrls, nextImageUrls) ||
    !deepEqual(existing.metadata ?? {}, update.metadata) ||
    (existing.type_id ?? null) !== update.typeId
  )
}

export async function importProductgroupFromSalesforce(
  container: MedusaContainer,
  input: ImportProductgroupInput
): Promise<ImportProductgroupResult> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const group = input.groupRecord as SfProductgroupShape
  const directChildren = input.childRecords as SfCourseProductShape[]
  const linkedGroup = (input.linkedGroupRecord ?? null) as SfProductgroupShape | null
  const linkedChildren = (input.linkedChildRecords ?? []) as SfCourseProductShape[]

  const childRows = mergeProductgroupChildRows(
    directChildren,
    group.Productgroup_Record_Type_Developer_Name__c,
    linkedChildren,
    linkedGroup?.Productgroup_Record_Type_Developer_Name__c
  )
  const children = childRows.map((row) => row.child)
  const importContext = input.importContext
  const contentFingerprint = productgroupImportFingerprint(group, children)

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

  if (importContext?.skipUnchanged) {
    const state = importContext.getProductgroupState(input.salesforceId)
    if (state?.mapping_version === contentFingerprint && state.medusa_id) {
      const parentIdsForSlave = importContext.getLinkedOnlineParentIds(input.salesforceId)
      const isLinkedOnlineSlave = parentIdsForSlave.length > 0
      const variantIds = await refreshEventItemsFromChildRows(
        container,
        sync,
        state.medusa_id,
        input.salesforceId,
        childRows,
        group,
        isLinkedOnlineSlave,
        importContext
      )
      return {
        medusaId: state.medusa_id,
        created: false,
        updated: false,
        skipped: true,
        skipReason: "unchanged",
        variantIds,
      }
    }
  }

  const title = group.Name?.trim() || `Product group ${input.salesforceId}`
  const handle = sanitizeProductHandle(
    group.Productgroup_URL__c,
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  )
  const description = stripHtmlToPlainText(group.Productgroup_Description__c) || undefined
  const thumbnail = group.Primary_1_Url__c?.trim() || undefined
  const images = productgroupGalleryUrls(group).map((url) => ({ url }))
  const recordType = mapSalesforceRecordType(group.Productgroup_Record_Type_Developer_Name__c)
  const subjects = parseProductgroupSubjects(group)
  const parentIdsForSlave = importContext
    ? importContext.getLinkedOnlineParentIds(input.salesforceId)
    : await findParentProductgroupIdsForLinkedOnlineSlave(sync, input.salesforceId)
  const isLinkedOnlineSlave = parentIdsForSlave.length > 0
  const bundleChild = children[0]
  const vathuisMetadata =
    bundleChild != null
      ? await buildVathuisMetadata({ group, bundleChild })
      : null
  const metadataExtra: Record<string, unknown> = {}
  if (isLinkedOnlineSlave) {
    metadataExtra.salesforce_is_linked_online_slave = true
    metadataExtra.salesforce_linked_online_parent_ids = parentIdsForSlave
  }
  const baseMetadata = productgroupMetadataFromSalesforce(group, null, metadataExtra)
  const metadata = {
    ...baseMetadata,
    ...(vathuisMetadata ? { vathuis: vathuisMetadata } : {}),
  }
  /** SF imports default hidden; VAthuis and linked-online slave catalogs stay off Ons aanbod. */
  const showInPlp = false

  const linked = importContext
    ? importContext.getProductgroupState(input.salesforceId)
    : await sync.getStateBySalesforceId(ENTITY_PRODUCTGROUP, input.salesforceId)
  let productId: string | null = linked?.medusa_id ?? null
  let existingProduct: {
    title?: string
    handle?: string
    description?: string | null
    thumbnail?: string | null
    images?: { url?: string }[]
    metadata?: Record<string, unknown> | null
    type_id?: string | null
  } | null = null

  if (productId) {
    const productModule = container.resolve(Modules.PRODUCT)
    try {
      existingProduct = await productModule.retrieveProduct(productId, {
        relations: ["images"],
      })
    } catch {
      productId = null
      existingProduct = null
    }
  }

  const shippingProfileId = importContext
    ? await importContext.getShippingProfileId(container)
    : await resolveDefaultShippingProfileId(container)
  const optionName = "Sessie"
  const optionValues = childRows.map(({ child }) => courseProductOptionLabel(child))
  const typeId = importContext
    ? await importContext.getProductTypeId(container, group.Productgroup_Record_Type_Developer_Name__c)
    : await resolveProductTypeId(container, group.Productgroup_Record_Type_Developer_Name__c)

  let created = false
  let updated = false

  if (productId) {
    await upsertIncomingLockBySalesforceId(sync, ENTITY_PRODUCTGROUP, productId, input.salesforceId)
    await upsertIncomingLockBySalesforceId(sync, "product", productId, input.salesforceId)

    const needsProductUpdate =
      !existingProduct ||
      productUpdateNeedsApply(existingProduct, {
        title,
        handle,
        description,
        thumbnail,
        images,
        metadata,
        typeId: typeId,
      })

    if (needsProductUpdate) {
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
    }
  } else {
    productId = generateEntityId(undefined, "prod")
    await upsertIncomingLockBySalesforceId(sync, ENTITY_PRODUCTGROUP, productId, input.salesforceId)
    await upsertIncomingLockBySalesforceId(sync, "product", productId, input.salesforceId)

    const variantPayload =
      children.length > 0
        ? children.map((child) => ({
            title: courseProductVariantTitle(child),
            sku: variantSkuForChild(child.Id!, { isLinkedOnlineSlave }),
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

  if (!created && optionValues.length > 0) {
    await ensureProductSessionOptionValues(container, productId, optionName, optionValues)
  }

  await ensureEventGroup(container, productId, recordType, showInPlp)
  await ensureProductInDefaultSalesChannel(container, productId, importContext)
  await linkNativeProductCategoriesByLabels(container, productId, subjects, importContext)
  await linkProductCategoriesByLabels(container, productId, subjects, importContext)
  await linkDocentFromSalesforce(
    container,
    productId,
    group,
    bundleChild ?? children[0] ?? null,
    importContext
  )

  const variantIds: string[] = []

  if (created && children.length > 0) {
    const productModule = container.resolve(Modules.PRODUCT)
    const product = await productModule.retrieveProduct(productId, { relations: ["variants"] })
    const variants = product.variants ?? []

    for (let i = 0; i < childRows.length; i++) {
      const { child, groupRecordType } = childRows[i]
      if (!child.Id) continue
      const variant =
        variants.find((v) =>
          v.sku === variantSkuForChild(child.Id!, { isLinkedOnlineSlave })
        ) ?? variants[i]
      if (!variant?.id) continue

      await upsertVariantSyncState(
        sync,
        variant.id,
        variantSyncSalesforceId(child.Id!, input.salesforceId, { isLinkedOnlineSlave })
      )
      await upsertEventItemForVariant(
        container,
        variant.id,
        child,
        group,
        groupRecordType,
        importContext
      )
      variantIds.push(variant.id)
    }
  } else {
    variantIds.push(
      ...(await syncChildVariantsBatch(
        container,
        sync,
        productId,
        input.salesforceId,
        childRows,
        group,
        optionName,
        isLinkedOnlineSlave,
        importContext
      ))
    )
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
        mapping_version: contentFingerprint,
      },
    ])
  } else {
    await sync.updateSalesforceSyncStates({
      id: pgRow.id,
      salesforce_id: input.salesforceId,
      last_pulled_at: now,
      last_status: "success",
      last_error: null,
      mapping_version: contentFingerprint,
    })
  }

  importContext?.setProductgroupFingerprint(input.salesforceId, contentFingerprint, productId)

  if (!input.skipSanitySync) {
    await syncProductById(productId, container).catch((err) => {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
      logger.warn(
        `[import-productgroup] Sanity sync failed for ${productId}: ${err instanceof Error ? err.message : String(err)}`
      )
    })
  }

  if (!input.skipSearch) {
    const search = container.resolve("search") as import("../search/service").default
    if (search.isEnabled()) {
      await search.reindexProductById(container, productId).catch(() => undefined)
    }
  }

  return { medusaId: productId, created, updated, variantIds }
}
