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
  cityRefsByEventItemId,
  docentenByEventItemId,
  eventItemDocentLinksForProducts,
  loadFacetEntitiesForEventItems,
  locationsByEventItemId,
  mergeCityRefsForProduct,
  mergeDocentenForProduct,
  uniqueLocationsForVariants,
} from "./event-item-facet-links"
import {
  futureAvailableSessionsForListing,
  futureOfflineSessionsForListing,
  productHasFutureAvailableSession,
} from "./event-session-eligibility"
import { minPriceCentsFromVariants, medusaMajorToCents } from "./medusa-price-to-cents"
import { ctaBarFieldsFromMetadata } from "./product-cta-bar"
import { salesforceOrderFromMetadata } from "./listing-sort"
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
  PLP_TOP_SLOT_COUNT,
  redisGetJson,
  REDIS_KEY_PLP,
  redisSetJson,
  REDIS_KEY_AGENDA,
  REDIS_KEY_REGISTRATIONS,
  REDIS_KEY_VATHUIS,
} from "./store-listing-redis"
import {
  sortListingBySalesforceOrder,
  tieBreakEventsByStartThenTitle,
} from "./listing-sort"

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

export type VathuisListingSnapshot = {
  list: Record<string, unknown>[]
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
  const productMetadataById: Record<string, Record<string, unknown> | null | undefined> = {}
  for (const p of allProducts ?? []) {
    const row = p as { id?: string; handle?: string; metadata?: Record<string, unknown> | null }
    if (row.id) {
      productHandleById[row.id] = row.handle
      productMetadataById[row.id] = row.metadata ?? null
    }
  }

  const eligibleProductIds = filterStoreListingProductIds(
    (allProducts ?? []).map((p) => (p as { id: string }).id).filter(Boolean),
    productHandleById,
    eventGroupByProduct,
    productMetadataById
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
      "metadata",
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

  const allVariants = ((products ?? []) as Record<string, unknown>[]).flatMap(
    (p) => (p.variants ?? []) as Array<{ id?: string; event_item?: Record<string, unknown> | null }>
  )

  const [catLinksAll, { data: docLinksAll }] = await Promise.all([
    listProductCatalogCategoryLinks(scope, { product_id: eligibleProductIds }),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: eligibleProductIds },
    }),
  ])

  const { cityById, locationById, docentById } = await loadFacetEntitiesForEventItems(
    scope,
    allVariants
  )
  const docentByEventItem = docentenByEventItemId(allVariants, docentById)
  const cityByEventItem = cityRefsByEventItemId(allVariants, cityById)
  const locationByEventItem = locationsByEventItemId(allVariants, locationById)

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

    const cities = mergeCityRefsForProduct(
      uniqueCityRefsFromEventItems(futureOfflineItems, cityLabelMap),
      variants as Array<{ event_item?: { id?: string } | null }>,
      cityByEventItem
    )
    const locations = uniqueLocationsForVariants(
      variants as Array<{ event_item?: { id?: string } | null }>,
      locationByEventItem
    )

    const deliveryTypesOnProduct = [
      ...new Set(
        eventItems.map((ei) => (ei as { delivery_type?: string }).delivery_type).filter(Boolean)
      ),
    ] as string[]

    const priceFrom = minPriceCentsFromVariants(variants as Parameters<typeof minPriceCentsFromVariants>[0])

    const futureAvailableItems = futureAvailableSessionsForListing(
      eventItems as Parameters<typeof futureAvailableSessionsForListing>[0],
      listingNow
    )

    const minAvailableQty = futureAvailableItems.length
      ? Math.min(
          ...futureAvailableItems.map((ei) =>
            Number((ei as { available_quantity?: number }).available_quantity ?? 0)
          )
        )
      : null

    const id = p.id as string
    const { metadata, ...productFields } = p
    const ctaFields = ctaBarFieldsFromMetadata(metadata as Record<string, unknown> | undefined)
    return {
      ...productFields,
      ...ctaFields,
      salesforce_order: salesforceOrderFromMetadata(metadata as Record<string, unknown> | undefined),
      record_type: eventGroupByProduct[id]?.record_type ?? null,
      product_type: (p.type as { value?: string } | null | undefined)?.value ?? null,
      categories: categoryByProduct[id] ?? [],
      docenten: mergeDocentenForProduct(
        docentByProduct[id] ?? [],
        variants as Array<{ event_item?: { id?: string } | null }>,
        docentByEventItem
      ),
      cities,
      locations,
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
    return productHasFutureAvailableSession(
      eventItems as Parameters<typeof productHasFutureAvailableSession>[0],
      listingNow
    )
  })

  const variantIdToProductId: Record<string, string> = {}
  for (const p of list) {
    const productId = p.id as string
    for (const variant of (p.variants ?? []) as Array<{ id?: string }>) {
      if (variant.id) variantIdToProductId[variant.id] = productId
    }
  }

  const mergedDocLinksAll = [
    ...((docLinksAll ?? []) as PlpListingSnapshot["docLinksAll"]),
    ...eventItemDocentLinksForProducts(
      list.flatMap((p) =>
        ((p.variants ?? []) as Array<{ id?: string; event_item?: Record<string, unknown> | null }>).map(
          (variant) => ({ ...variant })
        )
      ),
      docentByEventItem,
      variantIdToProductId
    ),
  ]

  return {
    list,
    eventGroupLinks,
    catLinksAll,
    docLinksAll: mergedDocLinksAll,
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
  memorySlot: "plp" | "agenda" | "vathuis" | "registrations",
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
const vathuisInflight = { current: null as Promise<VathuisListingSnapshot> | null }
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

async function buildVathuisSnapshot(scope: MedusaContainer): Promise<VathuisListingSnapshot> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: eventGroupLinks } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["product_id", "event_group.record_type"],
  })

  const vathuisProductIds = (eventGroupLinks ?? [])
    .filter((r) => {
      const row = r as { product_id?: string; event_group?: { record_type?: string } | null }
      return row.event_group?.record_type === "vathuis" && row.product_id
    })
    .map((r) => (r as { product_id: string }).product_id)

  if (!vathuisProductIds.length) {
    return { list: [], builtAt: Date.now() }
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
      "metadata",
      "type.value",
      "variants.*",
      "variants.prices.*",
    ],
    filters: { id: vathuisProductIds, status: "published" },
  })

  const [catLinksAll, { data: docLinksAll }] = await Promise.all([
    listProductCatalogCategoryLinks(scope, { product_id: vathuisProductIds }),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: vathuisProductIds },
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

  const list = (products ?? []).map((p) => {
    const row = p as Record<string, unknown>
    const id = row.id as string
    const metadata = (row.metadata ?? {}) as Record<string, unknown>
    const vathuisRaw = metadata.vathuis
    const vathuis =
      vathuisRaw && typeof vathuisRaw === "object"
        ? (vathuisRaw as Record<string, unknown>)
        : null
    const variants = (row.variants ?? []) as Record<string, unknown>[]
    const ctaFields = ctaBarFieldsFromMetadata(metadata)
    const { metadata: _metadata, ...productFields } = row

    return {
      ...productFields,
      ...ctaFields,
      salesforce_order: salesforceOrderFromMetadata(metadata),
      record_type: "vathuis",
      purchase_mode:
        typeof vathuis?.purchase_mode === "string" ? vathuis.purchase_mode : "bundle_only",
      product_type: (row.type as { value?: string } | null | undefined)?.value ?? null,
      categories: categoryByProduct[id] ?? [],
      docenten: docentByProduct[id] ?? [],
      price_from: minPriceCentsFromVariants(
        variants as Parameters<typeof minPriceCentsFromVariants>[0]
      ),
      vathuis: vathuis
        ? {
            episode_count_label:
              typeof vathuis.episode_count_label === "string"
                ? vathuis.episode_count_label
                : null,
            play_time: typeof vathuis.play_time === "string" ? vathuis.play_time : null,
            purchase_mode:
              typeof vathuis.purchase_mode === "string" ? vathuis.purchase_mode : null,
          }
        : null,
    }
  })

  return { list, builtAt: Date.now() }
}

export async function getVathuisListingSnapshot(
  scope: MedusaContainer
): Promise<VathuisListingSnapshot> {
  return loadCached(
    REDIS_KEY_VATHUIS,
    "vathuis",
    () => buildVathuisSnapshot(scope),
    vathuisInflight
  )
}

/** Product ids shown on the first page of default `/ons-aanbod` (Salesforce order sort). */
export function topPlpProductIds(
  snapshot: PlpListingSnapshot,
  limit = PLP_TOP_SLOT_COUNT
): string[] {
  return sortListingBySalesforceOrder(snapshot.list, tieBreakEventsByStartThenTitle)
    .slice(0, limit)
    .map((p) => p.id as string)
}

/** True when `productId` is in the cached PLP snapshot's first page (no rebuild). */
export async function isProductInCachedPlpTopSlots(productId: string): Promise<boolean> {
  const snapshot = await redisGetJson<PlpListingSnapshot>(REDIS_KEY_PLP)
  if (!snapshot?.list?.length) return false
  return topPlpProductIds(snapshot).includes(productId)
}
