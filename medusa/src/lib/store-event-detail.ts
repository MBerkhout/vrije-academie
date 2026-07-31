import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../links/product-docenten"
import productEventGroupLink from "../links/product-event-group"
import { externalRegistrationUrlFromMetadata } from "./external-registration-url"
import { filterVariantsWithFutureSessions } from "./event-session-eligibility"
import { ctaBarFieldsFromMetadata } from "./product-cta-bar"
import {
  minPriceCentsFromVariants,
  normalizeVariantPricesForStorefront,
} from "./medusa-price-to-cents"
import { listCategoriesForProductIds } from "./product-catalog-category-links"
import {
  eventDetailRedisKey,
  EVENT_CACHE_TTL_SEC,
  redisGetJson,
  redisSetJson,
} from "./store-listing-redis"
import { stripVathuisPublicEmbeds } from "./vathuis-episode-lookup"
import {
  isVathuisUnlimitedAvailability,
  VATHUIS_UNLIMITED_AVAILABILITY,
} from "./vathuis-availability"

const detailInflight = new Map<string, Promise<Record<string, unknown> | null>>()

function dayPart(startAt: string | null | undefined): string | null {
  if (!startAt) return null
  const hour = new Date(startAt).getHours()
  if (hour < 12) return "ochtend"
  if (hour < 17) return "middag"
  return "avond"
}

/** Build enriched storefront event payload for GET /store/events/:handle. */
export async function buildStoreEventDetail(
  scope: MedusaContainer,
  handle: string
): Promise<Record<string, unknown> | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

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

  const product = products?.[0] as Record<string, unknown> | undefined
  if (!product?.id) return null

  const { data: groupLinks } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["product_id", "event_group.*"],
    filters: { product_id: product.id },
  })
  const eventGroup = (groupLinks?.[0] as { event_group?: Record<string, unknown> | null })
    ?.event_group ?? null

  const [{ byProductId: categoryByProduct }, { data: docLinks }] = await Promise.all([
    listCategoriesForProductIds(scope, product.id as string),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: product.id },
    }),
  ])

  const categories = categoryByProduct[product.id as string] ?? []
  const instructors = (docLinks ?? [])
    .map((r) => (r as { docent?: unknown }).docent)
    .filter(Boolean)

  const variants = filterVariantsWithFutureSessions(
    (product.variants ?? []) as Record<string, unknown>[]
  )
  const eventItems = variants.map((v) => v.event_item).filter(Boolean) as Record<string, unknown>[]

  const earliestStartAt =
    eventItems
      .map((ei) => ei.start_at)
      .filter(Boolean)
      .sort()[0] ?? null

  const cities = [...new Set(eventItems.map((ei) => ei.city).filter(Boolean))] as string[]
  const deliveryTypes = [
    ...new Set(eventItems.map((ei) => ei.delivery_type).filter(Boolean)),
  ] as string[]

  const priceFrom = minPriceCentsFromVariants(
    variants as Parameters<typeof minPriceCentsFromVariants>[0]
  )
  const hasFreeTrial = eventItems.some((ei) => ei.is_free_trial === true)

  const imageUrls = [
    ...((product.images ?? []) as { url?: string }[]).map((img) => img.url).filter(Boolean),
    ...(product.thumbnail &&
    !((product.images ?? []) as { url?: string }[]).some(
      (img) => img.url === product.thumbnail
    )
      ? [product.thumbnail]
      : []),
  ] as string[]

  const { metadata, ...productFields } = product
  const productMetadata = metadata as Record<string, unknown> | null | undefined
  const ctaFields = ctaBarFieldsFromMetadata(productMetadata)
  const hasLinkedOnlineSessions = Boolean(productMetadata?.salesforce_linked_online_productgroup_id)

  const vathuis = productMetadata?.vathuis as Record<string, unknown> | undefined
  const purchaseMode = vathuis?.purchase_mode ?? null
  const unlimitedAvailability = isVathuisUnlimitedAvailability({
    recordType: eventGroup?.record_type as string | null | undefined,
    purchaseMode: typeof purchaseMode === "string" ? purchaseMode : null,
  })
  const minAvailableQuantity = unlimitedAvailability
    ? VATHUIS_UNLIMITED_AVAILABILITY
    : eventItems.length
      ? Math.min(...eventItems.map((ei) => Number(ei.available_quantity ?? 0)))
      : null
  const sanitizedVathuis = vathuis ? stripVathuisPublicEmbeds(vathuis) : null
  const episodes = Array.isArray(sanitizedVathuis?.episodes) ? sanitizedVathuis.episodes : []
  const chapters = Array.isArray(sanitizedVathuis?.chapters) ? sanitizedVathuis.chapters : []
  const audiencePlayer =
    sanitizedVathuis?.audience_player && typeof sanitizedVathuis.audience_player === "object"
      ? (sanitizedVathuis.audience_player as Record<string, unknown>)
      : null
  const bundleVariantSalesforceId =
    typeof sanitizedVathuis?.bundle_variant_salesforce_id === "string"
      ? sanitizedVathuis.bundle_variant_salesforce_id
      : null
  const bundleVariant =
    bundleVariantSalesforceId != null
      ? variants.find((v) => v.sku === `sf-${bundleVariantSalesforceId}`) ?? variants[0]
      : purchaseMode === "bundle_only"
        ? variants[0]
        : null

  return {
    ...productFields,
    ...ctaFields,
    variants: variants.map((v) => {
      const eventItem = v.event_item as Record<string, unknown> | undefined
      const normalizedEventItem =
        unlimitedAvailability && eventItem
          ? { ...eventItem, available_quantity: VATHUIS_UNLIMITED_AVAILABILITY }
          : eventItem

      return {
        ...v,
        event_item: normalizedEventItem,
        prices: normalizeVariantPricesForStorefront(
          v.prices as Parameters<typeof normalizeVariantPricesForStorefront>[0]
        ),
        purchasable: purchaseMode === "bundle_only" ? v.id === bundleVariant?.id : true,
      }
    }),
    record_type: eventGroup?.record_type ?? null,
    product_type: (product.type as { value?: string } | null | undefined)?.value ?? null,
    has_free_trial_group: eventGroup?.has_free_trial ?? false,
    categories,
    instructors,
    cities,
    delivery_types: deliveryTypes,
    earliest_start_at: earliestStartAt,
    day_part_of_earliest: dayPart(earliestStartAt as string | null),
    price_from: priceFrom,
    min_available_quantity: minAvailableQuantity,
    has_free_trial: hasFreeTrial || (eventGroup?.has_free_trial ?? false),
    image_urls: imageUrls,
    external_registration_url: externalRegistrationUrlFromMetadata(productMetadata),
    has_linked_online_sessions: hasLinkedOnlineSessions,
    purchase_mode: purchaseMode,
    bundle_variant_id: bundleVariant?.id ?? null,
    vathuis: sanitizedVathuis
      ? {
          episode_count_label: sanitizedVathuis.episode_count_label ?? null,
          play_time: sanitizedVathuis.play_time ?? null,
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
}

export async function getCachedStoreEventDetail(
  scope: MedusaContainer,
  handle: string
): Promise<Record<string, unknown> | null> {
  const key = eventDetailRedisKey(handle)
  const cached = await redisGetJson<Record<string, unknown>>(key)
  if (cached) return cached

  let inflight = detailInflight.get(handle)
  if (!inflight) {
    inflight = buildStoreEventDetail(scope, handle).finally(() => {
      detailInflight.delete(handle)
    })
    detailInflight.set(handle, inflight)
  }

  const built = await inflight
  if (built) {
    await redisSetJson(key, built, EVENT_CACHE_TTL_SEC)
  }
  return built
}
