/**
 * Denormalized PLP / Agenda listing snapshots + registration counts.
 * Cached in Redis (shared across PM2 cluster workers) with in-memory fallback.
 */

import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../links/product-docenten"
import productEventGroupLink from "../links/product-event-group"
import CatalogModuleService from "../modules/catalog/service"
import {
  buildCityLabelMap,
  uniqueCityRefsFromEventItems,
  cityRefFromEventItem,
  type CityRef,
} from "./city-refs"
import {
  futureOfflineSessionsForListing,
  productEligibleForEventsListing,
} from "./event-session-eligibility"
import { minPriceCentsFromVariants, medusaMajorToCents } from "./medusa-price-to-cents"
import {
  listProductCatalogCategoryLinks,
  type ProductCatalogCategoryLink,
} from "./product-catalog-category-links"
import { filterStoreListingProductIds } from "./store-listing-eligibility"
import { getBaseEventData } from "./store-query-cache"
import {
  invalidateMemoryListingCaches,
  LISTING_CACHE_TTL_SEC,
  memoryGet,
  memorySet,
  redisGetJson,
  redisSetJson,
  REDIS_KEY_AGENDA,
  REDIS_KEY_PLP,
  REDIS_KEY_REGISTRATIONS,
} from "./store-listing-redis"

export type PlpListingSnapshot = {
  list: Record<string, unknown>[]
  eventGroupLinks: Array<{ product_id: string; event_group?: { record_type?: string } | null }>
  catLinksAll: ProductCatalogCategoryLink[]
  docLinksAll: Array<{ product_id: string; docent?: { slug: string; name: string } | null }>
  eventGroupByProduct: Record<string, { record_type?: string | null } | null>
  builtAt: number
}

export type AgendaOccurrenceRow = {
  id: string
  variant_id: string
  product_id: string
  product_handle: string
  product_title: string
  thumbnail: string | null
  record_type: string | null
  categories: unknown[]
  docenten: unknown[]
  tags: unknown[]
  has_exclusief_tag: boolean
  variant_title: string | null
  delivery_type: string
  city: string | null
  city_slug: string | null
  start_at: string | null
  end_at: string | null
  available_quantity: number
  is_free_trial: boolean
  registration_deadline_at: string | null
  price: number | null
  day_part: string | null
}

export type AgendaListingSnapshot = {
  items: AgendaOccurrenceRow[]
  builtAt: number
}

function dayPartFromStartAt(startAt: string | null | undefined): string | null {
  if (!startAt) return null
  const hour = new Date(startAt).getHours()
  if (hour < 12) return "ochtend"
  if (hour < 17) return "middag"
  return "avond"
}

async function resolveEligibleProductIds(
  scope: MedusaContainer,
  query: { graph: (opts: any) => Promise<{ data: unknown[] }> }
): Promise<{
  eligibleProductIds: string[]
  eventGroupByProduct: Record<string, { record_type?: string | null; show_in_plp?: boolean | null } | null>
  eventGroupLinks: PlpListingSnapshot["eventGroupLinks"]
}> {
  const { allProducts, eventGroupLinks } = await getBaseEventData(
    query,
    productEventGroupLink.entryPoint
  )

  const eventGroupByProduct: Record<string, { record_type?: string | null; show_in_plp?: boolean | null } | null> = {}
  for (const r of eventGroupLinks ?? []) {
    const row = r as { product_id?: string; event_group?: { record_type?: string; show_in_plp?: boolean } | null }
    if (row.product_id) eventGroupByProduct[row.product_id] = row.event_group ?? null
  }

  const productHandleById: Record<string, string | undefined> = {}
  for (const p of allProducts ?? []) {
    const row = p as { id?: string; handle?: string }
    if (row.id) productHandleById[row.id] = row.handle
  }

  const eligibleProductIds = filterStoreListingProductIds(
    (allProducts ?? []).map((p) => (p as { id: string }).id).filter(Boolean),
    productHandleById,
    eventGroupByProduct
  )

  return {
    eligibleProductIds,
    eventGroupByProduct,
    eventGroupLinks: eventGroupLinks as PlpListingSnapshot["eventGroupLinks"],
  }
}

async function buildPlpSnapshot(scope: MedusaContainer): Promise<PlpListingSnapshot> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const catalogCities = await catalog.listCities({}, { order: { sort_order: "ASC" } })
  const cityLabelMap = buildCityLabelMap(catalogCities)

  const { eligibleProductIds, eventGroupByProduct, eventGroupLinks } =
    await resolveEligibleProductIds(scope, query)

  if (!eligibleProductIds.length) {
    return {
      list: [],
      eventGroupLinks: [],
      catLinksAll: [],
      docLinksAll: [],
      eventGroupByProduct: {},
      builtAt: Date.now(),
    }
  }

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
      "tags.*",
      "variants.*",
      "variants.prices.*",
      "variants.event_item.*",
      "properties.*",
      "properties.property.*",
      "variants.properties.*",
      "variants.properties.property.*",
    ],
    filters: { id: eligibleProductIds },
  })

  const [catLinksAll, { data: docLinksAll }] = await Promise.all([
    listProductCatalogCategoryLinks(scope, { product_id: eligibleProductIds }),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: eligibleProductIds },
    }),
  ])

  const categoryByProduct: Record<string, unknown[]> = {}
  for (const row of catLinksAll) {
    if (!row.product_id || !row.catalog_category) continue
    ;(categoryByProduct[row.product_id] ??= []).push(row.catalog_category)
  }
  const docentByProduct: Record<string, unknown[]> = {}
  for (const row of docLinksAll ?? []) {
    const r = row as { product_id?: string; docent?: unknown }
    if (!r.product_id || !r.docent) continue
    ;(docentByProduct[r.product_id] ??= []).push(r.docent)
  }

  const listingNow = new Date()
  let list = (products ?? []) as Record<string, unknown>[]

  list = list.map((p) => {
    const variants = (p.variants ?? []) as Record<string, unknown>[]
    const eventItems = variants.map((v) => v.event_item).filter(Boolean)
    const futureOfflineItems = futureOfflineSessionsForListing(
      eventItems as Parameters<typeof futureOfflineSessionsForListing>[0],
      listingNow
    )

    const earliestStartAt =
      futureOfflineItems
        .map((ei) => (ei as { start_at?: string }).start_at)
        .filter(Boolean)
        .sort()[0] ?? null

    const cities = uniqueCityRefsFromEventItems(futureOfflineItems, cityLabelMap)

    const deliveryTypesOnProduct = [
      ...new Set(
        eventItems.map((ei) => (ei as { delivery_type?: string }).delivery_type).filter(Boolean)
      ),
    ] as string[]

    const priceFrom = minPriceCentsFromVariants(variants as Parameters<typeof minPriceCentsFromVariants>[0])

    const minAvailableQty = eventItems.length
      ? Math.min(
          ...eventItems.map((ei) => Number((ei as { available_quantity?: number }).available_quantity ?? 0))
        )
      : null

    const id = p.id as string
    return {
      ...p,
      record_type: eventGroupByProduct[id]?.record_type ?? null,
      product_type: (p.type as { value?: string } | null | undefined)?.value ?? null,
      categories: categoryByProduct[id] ?? [],
      docenten: docentByProduct[id] ?? [],
      cities,
      delivery_types: deliveryTypesOnProduct,
      earliest_start_at: earliestStartAt,
      day_part_of_earliest: dayPartFromStartAt(earliestStartAt),
      price_from: priceFrom,
      min_available_quantity: minAvailableQty,
    }
  })

  list = list.filter((p) => {
    const eventItems = ((p.variants ?? []) as Record<string, unknown>[])
      .map((v) => v.event_item)
      .filter(Boolean)
    return productEligibleForEventsListing(
      eventItems as Parameters<typeof productEligibleForEventsListing>[0],
      listingNow
    )
  })

  return {
    list,
    eventGroupLinks,
    catLinksAll,
    docLinksAll: (docLinksAll ?? []) as PlpListingSnapshot["docLinksAll"],
    eventGroupByProduct,
    builtAt: Date.now(),
  }
}

async function buildAgendaSnapshot(scope: MedusaContainer): Promise<AgendaListingSnapshot> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const catalogCities = await catalog.listCities({}, { order: { sort_order: "ASC" } })
  const cityLabelMap = buildCityLabelMap(catalogCities)

  const { eligibleProductIds, eventGroupByProduct } = await resolveEligibleProductIds(scope, query)

  if (!eligibleProductIds.length) {
    return { items: [], builtAt: Date.now() }
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "tags.*",
      "variants.id",
      "variants.title",
      "variants.prices.*",
      "variants.event_item.*",
    ],
    filters: { id: eligibleProductIds },
  })

  const [catLinksAll, { data: docLinksAll }] = await Promise.all([
    listProductCatalogCategoryLinks(scope, { product_id: eligibleProductIds }),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: eligibleProductIds },
    }),
  ])

  const categoryByProduct: Record<string, unknown[]> = {}
  for (const row of catLinksAll) {
    if (!row.product_id || !row.catalog_category) continue
    ;(categoryByProduct[row.product_id] ??= []).push(row.catalog_category)
  }
  const docentByProduct: Record<string, unknown[]> = {}
  for (const row of docLinksAll ?? []) {
    const r = row as { product_id?: string; docent?: unknown }
    if (!r.product_id || !r.docent) continue
    ;(docentByProduct[r.product_id] ??= []).push(r.docent)
  }

  const items = (products ?? []).flatMap((product) => {
    const p = product as Record<string, unknown>
    const variants = (p.variants ?? []) as Record<string, unknown>[]
    const categories = categoryByProduct[p.id as string] ?? []
    const docenten = docentByProduct[p.id as string] ?? []
    const productTagValues = ((p.tags ?? []) as { value?: string }[])
      .map((t) => (t?.value ?? "").toString())
      .filter(Boolean)
    const hasExclusiefTag = productTagValues.some((t) => t.toLowerCase().includes("exclusief"))

    return variants
      .filter((v) => v.event_item)
      .map((v) => {
        const ei = v.event_item as Record<string, unknown>
        const prices = v.prices as { amount?: number }[] | undefined
        const priceCents =
          Array.isArray(prices) && prices.length
            ? Math.min(
                ...prices
                  .map((pr) => medusaMajorToCents(Number(pr?.amount ?? 0)))
                  .filter((n) => n > 0)
              )
            : null

        const cityRef = cityRefFromEventItem(
          ei as { city?: string | null; city_slug?: string | null },
          cityLabelMap
        )

        return {
          id: ei.id as string,
          variant_id: v.id as string,
          product_id: p.id as string,
          product_handle: p.handle as string,
          product_title: p.title as string,
          thumbnail: (p.thumbnail as string) ?? null,
          record_type: eventGroupByProduct[p.id as string]?.record_type ?? null,
          categories,
          docenten,
          tags: (Array.isArray(p.tags) ? p.tags : []) as unknown[],
          has_exclusief_tag: hasExclusiefTag,
          variant_title: (v.title as string) ?? null,
          delivery_type: ei.delivery_type as string,
          city: cityRef?.label ?? (ei.city as string) ?? null,
          city_slug: cityRef?.slug ?? (ei.city_slug as string) ?? null,
          start_at: (ei.start_at as string) ?? null,
          end_at: (ei.end_at as string) ?? null,
          available_quantity: Number(ei.available_quantity ?? 0),
          is_free_trial: !!ei.is_free_trial,
          registration_deadline_at: (ei.registration_deadline_at as string) ?? null,
          price: priceCents && priceCents > 0 ? priceCents : null,
          day_part: dayPartFromStartAt(ei.start_at as string),
        } satisfies AgendaOccurrenceRow
      })
  })

  return { items: items as AgendaOccurrenceRow[], builtAt: Date.now() }
}

async function buildRegistrationCounts(scope: MedusaContainer): Promise<Record<string, number>> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orderItems } = await query.graph({
    entity: "order",
    fields: ["items.variant.product_id", "items.quantity"],
    filters: { status: "completed" },
  })

  const counts: Record<string, number> = {}
  for (const order of orderItems ?? []) {
    for (const item of (order as { items?: { variant?: { product_id?: string }; quantity?: number }[] })
      .items ?? []) {
      const pid = item.variant?.product_id
      if (!pid) continue
      counts[pid] = (counts[pid] ?? 0) + (item.quantity ?? 1)
    }
  }
  return counts
}

async function loadCached<T>(
  redisKey: string,
  memorySlot: "plp" | "agenda" | "registrations",
  build: () => Promise<T>,
  inflightRef: { current: Promise<T> | null }
): Promise<T> {
  const fromRedis = await redisGetJson<T>(redisKey)
  if (fromRedis) return fromRedis

  const fromMemory = memoryGet<T>(memorySlot)
  if (fromMemory) return fromMemory

  if (!inflightRef.current) {
    inflightRef.current = build().finally(() => {
      inflightRef.current = null
    })
  }
  const value = await inflightRef.current

  await redisSetJson(redisKey, value, LISTING_CACHE_TTL_SEC)
  memorySet(memorySlot, value)
  return value
}

const plpInflight = { current: null as Promise<PlpListingSnapshot> | null }
const agendaInflight = { current: null as Promise<AgendaListingSnapshot> | null }
const regInflight = { current: null as Promise<Record<string, number>> | null }

export async function getPlpListingSnapshot(scope: MedusaContainer): Promise<PlpListingSnapshot> {
  return loadCached(REDIS_KEY_PLP, "plp", () => buildPlpSnapshot(scope), plpInflight)
}

export async function getAgendaListingSnapshot(scope: MedusaContainer): Promise<AgendaListingSnapshot> {
  return loadCached(REDIS_KEY_AGENDA, "agenda", () => buildAgendaSnapshot(scope), agendaInflight)
}

export async function getRegistrationCountsByProduct(
  scope: MedusaContainer
): Promise<Record<string, number>> {
  return loadCached(
    REDIS_KEY_REGISTRATIONS,
    "registrations",
    () => buildRegistrationCounts(scope),
    regInflight
  )
}
