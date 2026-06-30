import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../../../../links/product-docenten"
import productEventGroupLink from "../../../../links/product-event-group"
import {
  minPriceCentsFromVariants,
  normalizeVariantPricesForStorefront,
} from "../../../../lib/medusa-price-to-cents"
import { listCategoriesForProductIds } from "../../../../lib/product-catalog-category-links"
import { externalRegistrationUrlFromMetadata } from "../../../../lib/external-registration-url"
import { ctaBarFieldsFromMetadata } from "../../../../lib/product-cta-bar"
import { filterVariantsWithFutureSessions } from "../../../../lib/event-session-eligibility"

/** day_part derived from start_at hour: ochtend <12, middag 12–17, avond >=17 */
function dayPart(startAt: string | null | undefined): string | null {
  if (!startAt) return null
  const hour = new Date(startAt).getHours()
  if (hour < 12) return "ochtend"
  if (hour < 17) return "middag"
  return "avond"
}

/**
 * GET /store/events/:handle
 * Full Product Group enriched with EventGroup, variants, EventItems, categories, instructors,
 * images, tags, prices, and computed group-level fields.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const handle = req.params.handle as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "description",
      "thumbnail",
      "status",
      "created_at",
      "type.value",
      "metadata",
      "images.*",
      "tags.*",
      "variants.*",
      "variants.prices.*",
      "variants.event_item.*",
      "properties.*",
      "properties.property.*",
      "variants.properties.*",
      "variants.properties.property.*",
    ],
    filters: { handle },
  })

  const product = products?.[0] as Record<string, any> | undefined

  if (!product) {
    res.status(404).json({ message: "Event not found" })
    return
  }

  // Fetch event_group separately (the graph join may not resolve when no link exists)
  const { data: groupLinks } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["product_id", "event_group.*"],
    filters: { product_id: product.id },
  })
  const eventGroup = (groupLinks?.[0] as any)?.event_group ?? null

  // Fetch category + instructor links
  const [{ byProductId: categoryByProduct }, { data: docLinks }] = await Promise.all([
    listCategoriesForProductIds(req.scope, product.id),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: product.id },
    }),
  ])

  const categories = categoryByProduct[product.id] ?? []
  const instructors = (docLinks ?? []).map((r: any) => r.docent).filter(Boolean)

  // Compute group-level aggregates (past sessions are omitted from the storefront payload)
  const variants = filterVariantsWithFutureSessions(
    (product.variants ?? []) as Record<string, any>[]
  )
  const eventItems = variants.map((v) => v.event_item).filter(Boolean) as Record<string, any>[]

  const earliestStartAt = eventItems
    .map((ei) => ei.start_at)
    .filter(Boolean)
    .sort()[0] ?? null

  const cities = [...new Set(eventItems.map((ei) => ei.city).filter(Boolean))] as string[]

  const deliveryTypes = [...new Set(eventItems.map((ei) => ei.delivery_type).filter(Boolean))] as string[]

  const priceFrom = minPriceCentsFromVariants(variants)

  const minAvailableQuantity = eventItems.length
    ? Math.min(...eventItems.map((ei) => Number(ei.available_quantity ?? 0)))
    : null

  const hasFreeTrial = eventItems.some((ei) => ei.is_free_trial === true)

  const imageUrls = [
    ...(product.images ?? []).map((img: any) => img.url).filter(Boolean),
    ...(product.thumbnail && !(product.images ?? []).some((img: any) => img.url === product.thumbnail)
      ? [product.thumbnail]
      : []),
  ]

  const { metadata, ...productFields } = product
  const productMetadata = metadata as Record<string, unknown> | null | undefined
  const ctaFields = ctaBarFieldsFromMetadata(productMetadata)

  const vathuis = productMetadata?.vathuis as Record<string, unknown> | undefined
  const purchaseMode = vathuis?.purchase_mode ?? null
  const episodes = Array.isArray(vathuis?.episodes) ? vathuis.episodes : []
  const chapters = Array.isArray(vathuis?.chapters) ? vathuis.chapters : []
  const audiencePlayer =
    vathuis?.audience_player && typeof vathuis.audience_player === "object"
      ? (vathuis.audience_player as Record<string, unknown>)
      : null
  const bundleVariantSalesforceId =
    typeof vathuis?.bundle_variant_salesforce_id === "string"
      ? vathuis.bundle_variant_salesforce_id
      : null
  const bundleVariant =
    bundleVariantSalesforceId != null
      ? variants.find((v) => v.sku === `sf-${bundleVariantSalesforceId}`) ?? variants[0]
      : purchaseMode === "bundle_only"
        ? variants[0]
        : null

  const enriched = {
    ...productFields,
    ...ctaFields,
    variants: variants.map((v) => ({
      ...v,
      prices: normalizeVariantPricesForStorefront(v.prices),
      purchasable:
        purchaseMode === "bundle_only"
          ? v.id === bundleVariant?.id
          : true,
    })),
    record_type: eventGroup?.record_type ?? null,
    product_type: (product.type as { value?: string } | null | undefined)?.value ?? null,
    has_free_trial_group: eventGroup?.has_free_trial ?? false,
    categories,
    instructors,
    cities,
    delivery_types: deliveryTypes,
    earliest_start_at: earliestStartAt,
    day_part_of_earliest: dayPart(earliestStartAt),
    price_from: priceFrom,
    min_available_quantity: minAvailableQuantity,
    has_free_trial: hasFreeTrial || (eventGroup?.has_free_trial ?? false),
    image_urls: imageUrls,
    external_registration_url: externalRegistrationUrlFromMetadata(productMetadata),
    purchase_mode: purchaseMode,
    bundle_variant_id: bundleVariant?.id ?? null,
    vathuis: vathuis
      ? {
          episode_count_label: vathuis.episode_count_label ?? null,
          play_time: vathuis.play_time ?? null,
          episodes,
          chapters,
          audience_player: audiencePlayer
            ? {
                project_id: audiencePlayer.project_id ?? null,
                preview_url: audiencePlayer.preview_url ?? null,
                iframe_url: audiencePlayer.iframe_url ?? null,
              }
            : null,
        }
      : null,
  }

  res.json({ event: enriched })
}
