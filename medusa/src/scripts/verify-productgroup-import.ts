import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import productCategoriesLink from "../links/product-categories"
import productEventGroupLink from "../links/product-event-group"
import variantEventItemLink from "../links/variant-event-item"
import CatalogModuleService from "../modules/catalog/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { importProductgroupFromSalesforce } from "../modules/salesforce-sync/import-productgroup"
import {
  courseProductSalesforceFieldsForPull,
  SF_COURSE_PRODUCT_OBJECT,
} from "../modules/salesforce-sync/mappings/course-product"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "../modules/salesforce-sync/mappings/productgroup"
import { shouldImportProductgroup } from "../modules/salesforce-sync/utils/future-import-guard"

const SF_ID = "a05Mz00000YEMptIAH"

export default async function ({ container }: ExecArgs) {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pm = container.resolve(Modules.PRODUCT)

  const group = await sync.retrieve(
    SF_PRODUCTGROUP_OBJECT,
    SF_ID,
    [...productgroupSalesforceFieldsForPull]
  )
  const fields = courseProductSalesforceFieldsForPull.join(",")
  const q = await sync.query<Record<string, unknown>>(
    `SELECT ${fields} FROM ${SF_COURSE_PRODUCT_OBJECT} WHERE Productgroup__c = '${SF_ID}'`
  )

  const guardAuto = shouldImportProductgroup({ group, children: q.records, manual: false })
  const guardPast = shouldImportProductgroup({
    group: { ...group, Latest_Product_Start_Date__c: "2020-01-01" },
    children: q.records.map((c) => ({ ...c, Start_date_time__c: "2020-01-01" })),
    manual: false,
  })
  console.log("future guard auto:", guardAuto, "past-only auto:", guardPast, "manual past:", shouldImportProductgroup({
    group: { ...group, Latest_Product_Start_Date__c: "2020-01-01" },
    children: [],
    manual: true,
  }))

  const result1 = await importProductgroupFromSalesforce(container, {
    salesforceId: SF_ID,
    groupRecord: group,
    childRecords: q.records,
    manual: true,
  })
  const result2 = await importProductgroupFromSalesforce(container, {
    salesforceId: SF_ID,
    groupRecord: group,
    childRecords: q.records,
    manual: true,
  })

  const productId = result1.medusaId
  const product = await pm.retrieveProduct(productId, {
    relations: ["variants", "images"],
  })
  const { data: variantRows } = await query.graph({
    entity: "product",
    fields: ["variants.id", "variants.sku", "variants.prices.*"],
    filters: { id: productId },
  })
  const variantsWithPrices =
    ((variantRows?.[0] as { variants?: Array<{ id: string; sku?: string; prices?: { amount?: number; currency_code?: string }[] }> })
      ?.variants ?? [])

  const { data: egLinks } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["event_group.record_type", "event_group.show_in_plp"],
    filters: { product_id: productId },
  })
  const { data: catLinks } = await query.graph({
    entity: productCategoriesLink.entryPoint,
    fields: ["product_id", "catalog_category_id"],
    filters: { product_id: productId },
  })
  const allCats = await catalog.listCategories({}, { take: 1000 })
  const labelById = new Map(allCats.map((c) => [c.id, c.label]))

  const variants = []
  for (const v of variantsWithPrices) {
    const { data: eiLinks } = await query.graph({
      entity: variantEventItemLink.entryPoint,
      fields: ["event_item.start_at", "event_item.city", "event_item.is_free_trial"],
      filters: { product_variant_id: v.id },
    })
    const ei = (eiLinks?.[0] as { event_item?: Record<string, unknown> })?.event_item
    variants.push({
      id: v.id,
      sku: v.sku,
      prices: (v.prices ?? []).map((p: { amount?: number; currency_code?: string }) => ({
        amount: p.amount,
        currency: p.currency_code,
      })),
      event_item: ei,
    })
  }

  const report = {
    idempotent: result1.medusaId === result2.medusaId && result2.created === false,
    import1: result1,
    import2: result2,
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      thumbnail: !!product.thumbnail,
      imageCount: product.images?.length,
      metadata_keys: Object.keys(product.metadata ?? {}),
    },
    event_group: (egLinks?.[0] as { event_group?: Record<string, unknown> })?.event_group,
    categories: (catLinks ?? []).map((r) => {
      const id = (r as { catalog_category_id?: string }).catalog_category_id
      return id ? labelById.get(id) : null
    }),
    variants,
  }

  console.log(JSON.stringify(report, null, 2))

  const ok =
    report.idempotent &&
    product.title === "Lezing Amrita Sher-Gil" &&
    product.handle === "lezing-amrita-sher-gil" &&
    report.event_group?.show_in_plp === false &&
    report.event_group?.record_type === "lezing" &&
    report.categories.length === 2 &&
    variants.length === 2 &&
    variants.every((v) => v.prices.some((p: { amount?: number }) => p.amount === 19.5)) &&
    guardAuto === true &&
    guardPast === false

  if (!ok) {
    throw new Error("Productgroup import verification failed — see report above")
  }
  console.log("OK — productgroup import verification passed")
}
