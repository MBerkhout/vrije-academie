import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productCategoriesLink from "../../links/product-categories"
import productDocentenLink from "../../links/product-docenten"
import productEventGroupLink from "../../links/product-event-group"
import CatalogModuleService from "../catalog/service"
import { minPriceCentsFromVariants } from "../../lib/medusa-price-to-cents"
import { externalRegistrationUrlFromMetadata } from "../../lib/external-registration-url"
import { ctaBarFieldsFromMetadata } from "../../lib/product-cta-bar"
import { mirrorProduct } from "./service"
import { buildSalesforceImportedBody } from "./html-to-pdp-body"

/**
 * Fetches all required data for a product and pushes it to Sanity.
 * Used by the product subscriber, the admin push route, and link mutation routes.
 */
export async function syncProductById(
  productId: string,
  container: MedusaContainer
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>

  const [{ data: products }, { data: catLinks }, { data: docLinks }, { data: groupLinks }] =
    await Promise.all([
      query.graph({
        entity: "product",
        fields: [
          "id", "title", "handle", "description", "thumbnail", "metadata",
          "images.*",
          "tags.*",
          "variants.*",
          "variants.prices.*",
          "variants.event_item.*",
        ],
        filters: { id: productId },
      }),
      query.graph({
        entity: productCategoriesLink.entryPoint,
        fields: ["product_id", "catalog_category_id"],
        filters: { product_id: productId },
      }),
      query.graph({
        entity: productDocentenLink.entryPoint,
        fields: ["product_id", "docent.*"],
        filters: { product_id: productId },
      }),
      query.graph({
        entity: productEventGroupLink.entryPoint,
        fields: ["product_id", "event_group.*"],
        filters: { product_id: productId },
      }),
    ])

  const product = products?.[0] as Record<string, any>
  if (!product) return

  const categoryIds = (catLinks ?? [])
    .map((r: { catalog_category_id?: string }) => r.catalog_category_id)
    .filter(Boolean) as string[]
  const allCategories = categoryIds.length
    ? await catalog.listCategories({ id: categoryIds })
    : []
  const categories = allCategories.map((c) => ({
    id: c.id,
    slug: c.slug,
    label: c.label,
  }))
  const docenten = (docLinks ?? []).map((r: any) => r.docent).filter(Boolean)
  const recordType = (groupLinks?.[0] as any)?.event_group?.record_type

  const variants = (product.variants ?? []) as Record<string, any>[]
  const eventItems = variants.map((v) => v.event_item).filter(Boolean)
  const earliestStartAt = eventItems.map((ei: any) => ei?.start_at).filter(Boolean).sort()[0] ?? null
  const cities = [...new Set(eventItems.map((ei: any) => ei?.city).filter(Boolean))] as string[]
  const priceFrom = minPriceCentsFromVariants(variants)

  const hasFreeTrial = eventItems.some((ei: any) => ei?.is_free_trial === true)

  const imageUrls = [
    ...(product.images ?? []).map((img: any) => img.url).filter(Boolean),
    ...(product.thumbnail && !(product.images ?? []).some((img: any) => img.url === product.thumbnail)
      ? [product.thumbnail]
      : []),
  ] as string[]

  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const seoTitle =
    (typeof metadata.salesforce_seo_title === "string" && metadata.salesforce_seo_title) || null
  const seoDescription =
    (typeof metadata.salesforce_seo_description === "string" && metadata.salesforce_seo_description) ||
    null
  const externalRegistrationUrl = externalRegistrationUrlFromMetadata(metadata)
  const importedBodyBlocks = buildSalesforceImportedBody(metadata, product.description)
  const ctaFields = ctaBarFieldsFromMetadata(metadata)

  await mirrorProduct({
    id: product.id,
    handle: product.handle,
    title: product.title,
    record_type: recordType,
    thumbnail: product.thumbnail,
    image_urls: imageUrls,
    description: product.description,
    tags: product.tags ?? [],
    categories,
    docenten,
    has_free_trial: hasFreeTrial,
    price_from: priceFrom,
    cities,
    earliest_start_at: earliestStartAt,
    badge: ctaFields.badge,
    cta_color: ctaFields.cta_color,
    cta_color_hover: ctaFields.cta_color_hover,
    seo_title: seoTitle,
    seo_description: seoDescription,
    external_registration_url: externalRegistrationUrl,
    imported_body_blocks: importedBodyBlocks,
  })
}
