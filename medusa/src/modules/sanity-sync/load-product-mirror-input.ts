import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productCategoriesLink from "../../links/product-categories"
import productDocentenLink from "../../links/product-docenten"
import productEventGroupLink from "../../links/product-event-group"
import { minPriceCentsFromVariants } from "../../lib/medusa-price-to-cents"
import { resolveProductExternalRegistrationUrl } from "../../lib/external-registration-url"
import { imageCaptionsForUrls } from "../../lib/gallery-images"
import { ctaBarFieldsFromMetadata } from "../../lib/product-cta-bar"
import CatalogModuleService from "../catalog/service"
import type { MirrorProductInput } from "./build-product-doc"
import { buildSalesforceImportedBody } from "./html-to-pdp-body"

export async function loadProductMirrorInputs(
  productIds: string[],
  container: MedusaContainer
): Promise<Map<string, MirrorProductInput>> {
  const result = new Map<string, MirrorProductInput>()
  if (!productIds.length) return result

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>

  const uniqueIds = [...new Set(productIds)]

  const [{ data: products }, { data: catLinks }, { data: docLinks }, { data: groupLinks }] =
    await Promise.all([
      query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "handle",
          "description",
          "thumbnail",
          "metadata",
          "images.*",
          "tags.*",
          "variants.*",
          "variants.prices.*",
          "variants.event_item.*",
        ],
        filters: { id: uniqueIds },
      }),
      query.graph({
        entity: productCategoriesLink.entryPoint,
        fields: ["product_id", "catalog_category_id"],
        filters: { product_id: uniqueIds },
      }),
      query.graph({
        entity: productDocentenLink.entryPoint,
        fields: ["product_id", "docent.*"],
        filters: { product_id: uniqueIds },
      }),
      query.graph({
        entity: productEventGroupLink.entryPoint,
        fields: ["product_id", "event_group.*"],
        filters: { product_id: uniqueIds },
      }),
    ])

  const categoryIds = [
    ...new Set(
      (catLinks ?? [])
        .map((r: { catalog_category_id?: string }) => r.catalog_category_id)
        .filter(Boolean) as string[]
    ),
  ]
  const allCategories = categoryIds.length ? await catalog.listCategories({ id: categoryIds }) : []
  const categoryById = new Map(allCategories.map((c) => [c.id, c]))

  const categoriesByProduct = new Map<string, { id: string; slug: string; label: string }[]>()
  for (const row of catLinks ?? []) {
    const productId = (row as { product_id?: string }).product_id
    const categoryId = (row as { catalog_category_id?: string }).catalog_category_id
    if (!productId || !categoryId) continue
    const cat = categoryById.get(categoryId)
    if (!cat) continue
    const list = categoriesByProduct.get(productId) ?? []
    list.push({ id: cat.id, slug: cat.slug, label: cat.label })
    categoriesByProduct.set(productId, list)
  }

  const docentenByProduct = new Map<string, Record<string, unknown>[]>()
  for (const row of docLinks ?? []) {
    const productId = (row as { product_id?: string }).product_id
    const docent = (row as { docent?: Record<string, unknown> & { is_active?: boolean } }).docent
    if (!productId || !docent) continue
    if (docent.is_active === false) continue
    const list = docentenByProduct.get(productId) ?? []
    list.push(docent)
    docentenByProduct.set(productId, list)
  }

  const recordTypeByProduct = new Map<string, string | undefined>()
  for (const row of groupLinks ?? []) {
    const productId = (row as { product_id?: string }).product_id
    const recordType = (row as { event_group?: { record_type?: string } }).event_group?.record_type
    if (productId) recordTypeByProduct.set(productId, recordType)
  }

  for (const product of (products ?? []) as Record<string, unknown>[]) {
    const productId = product.id as string
    if (!productId) continue

    const variants = (product.variants ?? []) as Record<string, unknown>[]
    const eventItems = variants
      .map((v) => v.event_item)
      .filter((ei): ei is Record<string, unknown> => !!ei && typeof ei === "object")
    const earliestStartAt =
      eventItems
        .map((ei) => ei.start_at)
        .filter(Boolean)
        .sort()[0] ?? null
    const cities = [
      ...new Set(eventItems.map((ei) => ei.city).filter(Boolean)),
    ] as string[]
    const priceFrom = minPriceCentsFromVariants(variants as Parameters<typeof minPriceCentsFromVariants>[0])
    const hasFreeTrial = eventItems.some((ei) => ei.is_free_trial === true)

    const imageUrls = [
      ...((product.images ?? []) as { url?: string }[]).map((img) => img.url).filter(Boolean),
      ...(product.thumbnail &&
      !((product.images ?? []) as { url?: string }[]).some((img) => img.url === product.thumbnail)
        ? [product.thumbnail as string]
        : []),
    ] as string[]

    const metadata = (product.metadata ?? {}) as Record<string, unknown>
    const seoTitle =
      (typeof metadata.salesforce_seo_title === "string" && metadata.salesforce_seo_title) || null
    const seoDescription =
      (typeof metadata.salesforce_seo_description === "string" &&
        metadata.salesforce_seo_description) ||
      null
    const externalRegistrationUrl = resolveProductExternalRegistrationUrl(
      metadata,
      variants.map((v) => (v.metadata as Record<string, unknown> | null | undefined) ?? null)
    )
    const importedBodyBlocks = buildSalesforceImportedBody(
      metadata,
      product.description as string | null | undefined
    )
    const ctaFields = ctaBarFieldsFromMetadata(metadata)

    result.set(productId, {
      id: productId,
      handle: product.handle as string,
      title: product.title as string,
      record_type: recordTypeByProduct.get(productId),
      thumbnail: (product.thumbnail as string | null | undefined) ?? null,
      image_urls: imageUrls,
      image_captions: imageCaptionsForUrls(imageUrls, metadata),
      description: (product.description as string | null | undefined) ?? null,
      tags: (product.tags ?? []) as { value: string }[],
      categories: categoriesByProduct.get(productId) ?? [],
      docenten: (docentenByProduct.get(productId) ?? []) as {
        id: string
        slug: string
        name: string
      }[],
      has_free_trial: hasFreeTrial,
      price_from: priceFrom,
      cities,
      earliest_start_at: (earliestStartAt as string | null) ?? null,
      badge: ctaFields.badge,
      cta_color: ctaFields.cta_color,
      cta_color_hover: ctaFields.cta_color_hover,
      seo_title: seoTitle,
      seo_description: seoDescription,
      external_registration_url: externalRegistrationUrl,
      imported_body_blocks: importedBodyBlocks,
    })
  }

  return result
}
