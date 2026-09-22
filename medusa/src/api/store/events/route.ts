import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { isSalesforceExterneVerhuur } from "../../../lib/salesforce-visible-on-website"
import { getPlpListingSnapshot, getRegistrationCountsByProduct, getVathuisListingSnapshot } from "../../../lib/store-listing-snapshot"
import {
  countPreRecordedDelivery,
  injectVathuisDeliveryFacet,
  isVathuisListingRow,
  mergeVathuisIntoPlpList,
  taxonomyFacetsFromListingRows,
} from "../../../lib/merge-vathuis-into-plp"
import { LISTING_CACHE_TTL_SEC } from "../../../lib/store-listing-redis"
import { filterProductsBySearchQuery, sortByRelevanceRank } from "../../../lib/search-query"
import {
  incrementCityFacetCounts,
  sortCityFacetsByCount,
  type CityRef,
} from "../../../lib/city-refs"
import { productTypeMatchesFilter, productTypeToSlug } from "../../../lib/plp-product-types"
import {
  sortListingBySalesforceOrder,
  tieBreakEventsByStartThenTitle,
  tieBreakByTitle,
} from "../../../lib/listing-sort"
import {
  dayPartFromStartAt,
  earliestMatchingSessionStartAt,
  futureEventItemsMatchSessionFilters,
  listingSessionFiltersOmitting,
  matchingListingSessions,
  uniqueFutureDayParts,
  uniqueFutureMonthKeys,
  uniqueSessionCityRefs,
  type ListingSessionFilters,
} from "../../../lib/listing-future-filters"
import type { EventItemListingRow } from "../../../lib/event-session-eligibility"

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return []
  return (Array.isArray(val) ? val : [val]).flatMap((v) => v.split(",")).filter(Boolean)
}

function eventItemsFromListingProduct(p: Record<string, unknown>): EventItemListingRow[] {
  return ((p.variants ?? []) as Array<{ event_item?: EventItemListingRow | null }>)
    .map((variant) => variant.event_item)
    .filter((ei): ei is EventItemListingRow => Boolean(ei))
}

function setListingCacheHeaders(res: MedusaResponse): void {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${LISTING_CACHE_TTL_SEC}, stale-while-revalidate=${LISTING_CACHE_TTL_SEC}`
  )
}

/**
 * GET /store/events — PLP listing (one row per product).
 * Heavy enrichment is served from a Redis-backed snapshot; this handler only filters, facets, sorts, paginates.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const q = req.query
  const searchQ = typeof q.q === "string" ? q.q.trim() : ""
  const recordTypes = parseArrayParam(q.record_type as string | string[])
  const productTypes = parseArrayParam(q.product_type as string | string[])
  const deliveryTypes = parseArrayParam(q.delivery_type as string | string[])
  const categorySlugs = parseArrayParam(q.category as string | string[])
  const docentSlugs = parseArrayParam(q.docent as string | string[])
  const citySlugs = parseArrayParam(q.city as string | string[])
  const dayParts = parseArrayParam(q.day_part as string | string[])
  const periodStart = typeof q.period_start === "string" ? q.period_start : null
  const periodEnd = typeof q.period_end === "string" ? q.period_end : null
  const sort = typeof q.sort === "string" ? q.sort : "order"
  const limit = Math.min(Math.max(1, Number(q.limit) || 24), 100)
  const offset = Math.max(0, Number(q.offset) || 0)

  const propertyFilters: Record<string, string> = {}
  for (const [key, raw] of Object.entries(q)) {
    const m = key.match(/^property\[(.+)\]$/)
    if (!m) continue
    const v = Array.isArray(raw) ? raw[0] : raw
    if (typeof v === "string" && v) propertyFilters[m[1]] = v
  }

  const snapshot = await getPlpListingSnapshot(req.scope)
  const vathuisSnapshot = await getVathuisListingSnapshot(req.scope)
  let list = [...snapshot.list].filter(
    (p) => !isSalesforceExterneVerhuur(p.title as string | undefined, p.record_type as string | undefined)
  )
  list = mergeVathuisIntoPlpList(list, vathuisSnapshot.list)

  if (recordTypes.length) {
    list = list.filter((p) => {
      const rt = p.record_type as string | null
      return rt && recordTypes.includes(rt)
    })
  }

  if (categorySlugs.length) {
    list = list.filter((p) =>
      ((p.categories ?? []) as { slug?: string }[]).some(
        (c) => c.slug && categorySlugs.includes(c.slug)
      )
    )
  }

  if (docentSlugs.length) {
    list = list.filter((p) =>
      ((p.docenten ?? []) as { slug?: string }[]).some(
        (d) => d.slug && docentSlugs.includes(d.slug)
      )
    )
  }

  if (Object.keys(propertyFilters).length) {
    list = list.filter((p) => {
      const productProps = propertyMapFromRows((p.properties ?? []) as unknown[])
      const variantPropsList = ((p.variants ?? []) as Record<string, unknown>[]).map((v) =>
        propertyMapFromRows((v.properties ?? []) as unknown[])
      )
      return matchesPropertyFilters(productProps, variantPropsList, propertyFilters)
    })
  }

  let relevanceRank: Map<string, number> | null = null
  if (searchQ) {
    const searchResult = await filterProductsBySearchQuery(req.scope, list, searchQ)
    list = searchResult.list
    relevanceRank = searchResult.rankByProductId
  }

  if (productTypes.length) {
    list = list.filter((p) =>
      productTypeMatchesFilter(
        (p.type as { value?: string } | null | undefined)?.value ?? (p.product_type as string),
        productTypes
      )
    )
  }

  const sessionFilters: ListingSessionFilters = {
    citySlugs,
    dayParts,
    periodStart,
    periodEnd,
  }

  list = list.filter(
    (p) =>
      isVathuisListingRow(p) ||
      futureEventItemsMatchSessionFilters(eventItemsFromListingProduct(p), sessionFilters)
  )

  list = list.map((p) => {
    if (isVathuisListingRow(p)) return p
    const earliest = earliestMatchingSessionStartAt(
      eventItemsFromListingProduct(p),
      sessionFilters
    )
    return {
      ...p,
      earliest_start_at: earliest,
      day_part_of_earliest: dayPartFromStartAt(earliest),
    }
  })

  const vathuisFacetCount = countPreRecordedDelivery(list)

  if (deliveryTypes.length) {
    list = list.filter((p) =>
      ((p.delivery_types ?? []) as string[]).some((dt) => deliveryTypes.includes(dt))
    )
  } else {
    list = list.filter((p) => !isVathuisListingRow(p))
  }

  const facets = buildFacets(list, snapshot.eventGroupLinks, sessionFilters)
  const facetsWithVathuis = injectVathuisDeliveryFacet(facets, vathuisFacetCount)
  const count = list.length
  const registrationCounts =
    sort === "popularity" ? await getRegistrationCountsByProduct(req.scope) : null
  list = sortList(list, sort, relevanceRank, registrationCounts)
  list = list.slice(offset, offset + limit)

  setListingCacheHeaders(res)
  res.json({ events: list, count, facets: facetsWithVathuis })
}

function propertyMapFromRows(rows: unknown[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const row of rows) {
    const prop = (row as { property?: { key?: string; value?: string } })?.property
    if (prop?.key && prop?.value !== undefined) map[prop.key] = prop.value
  }
  return map
}

function matchesPropertyFilters(
  productProps: Record<string, string>,
  variantPropsList: Record<string, string>[],
  filters: Record<string, string>
): boolean {
  for (const [k, want] of Object.entries(filters)) {
    if (productProps[k] === want) continue
    if (!variantPropsList.some((vp) => vp[k] === want)) return false
  }
  return true
}

function sortList(
  list: Record<string, unknown>[],
  sort: string,
  relevanceRank: Map<string, number> | null = null,
  registrationCounts: Record<string, number> | null = null
): Record<string, unknown>[] {
  if (sort === "relevance" && relevanceRank?.size) {
    return sortByRelevanceRank(list, relevanceRank)
  }

  const sorted = [...list]
  switch (sort) {
    case "order":
      return sortListingBySalesforceOrder(list, tieBreakEventsByStartThenTitle)
    case "popularity": {
      const counts = registrationCounts ?? {}
      sorted.sort((a, b) => {
        const countDiff =
          (counts[b.id as string] ?? 0) - (counts[a.id as string] ?? 0)
        if (countDiff !== 0) return countDiff
        return (
          new Date((b.created_at as string) ?? 0).getTime() -
          new Date((a.created_at as string) ?? 0).getTime()
        )
      })
      break
    }
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date((b.created_at as string) ?? 0).getTime() -
          new Date((a.created_at as string) ?? 0).getTime()
      )
      break
    case "price_asc":
      sorted.sort(
        (a, b) =>
          ((a.price_from as number) ?? Infinity) - ((b.price_from as number) ?? Infinity)
      )
      break
    case "price_desc":
      sorted.sort((a, b) => ((b.price_from as number) ?? 0) - ((a.price_from as number) ?? 0))
      break
    case "start_date":
    default:
      sorted.sort((a, b) => {
        const aDate = a.earliest_start_at
          ? new Date(a.earliest_start_at as string).getTime()
          : Infinity
        const bDate = b.earliest_start_at
          ? new Date(b.earliest_start_at as string).getTime()
          : Infinity
        return aDate - bDate
      })
      break
  }
  return sorted
}

function buildFacets(
  list: Record<string, unknown>[],
  eventGroupLinks: { product_id: string; event_group?: { record_type?: string } | null }[],
  sessionFilters: ListingSessionFilters
): Record<string, unknown> {
  const productIds = new Set(list.map((p) => p.id as string))

  const recordTypeCounts: Record<string, number> = {}
  for (const r of eventGroupLinks) {
    if (!productIds.has(r.product_id)) continue
    const rt = r.event_group?.record_type
    if (rt) recordTypeCounts[rt] = (recordTypeCounts[rt] ?? 0) + 1
  }

  const { categories, docenten } = taxonomyFacetsFromListingRows(list)

  const cityCounts: Record<string, { slug: string; label: string; count: number }> = {}
  const deliveryTypeCounts: Record<string, number> = {}
  const dayPartCounts: Record<string, number> = {}
  const monthCounts: Record<string, number> = {}
  const productTypeCounts: Record<string, { slug: string; label: string; count: number }> = {}

  for (const p of list) {
    const eventItems = eventItemsFromListingProduct(p)
    const timeFiltered = matchingListingSessions(
      eventItems,
      listingSessionFiltersOmitting(sessionFilters, "city")
    )
    const cityFiltered = matchingListingSessions(
      eventItems,
      listingSessionFiltersOmitting(sessionFilters, "day_part")
    )
    const periodFiltered = matchingListingSessions(
      eventItems,
      listingSessionFiltersOmitting(sessionFilters, "period")
    )

    if (sessionFilters.dayParts.length || sessionFilters.periodStart || sessionFilters.periodEnd) {
      incrementCityFacetCounts(cityCounts, uniqueSessionCityRefs(timeFiltered))
    } else {
      incrementCityFacetCounts(cityCounts, (p.cities ?? []) as CityRef[])
    }

    for (const dt of (p.delivery_types ?? []) as string[]) {
      deliveryTypeCounts[dt] = (deliveryTypeCounts[dt] ?? 0) + 1
    }
    for (const dp of uniqueFutureDayParts(cityFiltered)) {
      dayPartCounts[dp] = (dayPartCounts[dp] ?? 0) + 1
    }
    for (const month of uniqueFutureMonthKeys(periodFiltered)) {
      monthCounts[month] = (monthCounts[month] ?? 0) + 1
    }
    const ptSlug = productTypeToSlug(p.product_type as string | undefined)
    if (ptSlug) {
      if (!productTypeCounts[ptSlug]) {
        productTypeCounts[ptSlug] = {
          slug: ptSlug,
          label: ptSlug.charAt(0).toUpperCase() + ptSlug.slice(1),
          count: 0,
        }
      }
      productTypeCounts[ptSlug].count++
    }
  }

  return {
    record_type: Object.entries(recordTypeCounts).map(([slug, count]) => ({ slug, count })),
    product_type: Object.values(productTypeCounts),
    categories,
    docenten,
    cities: sortCityFacetsByCount(Object.values(cityCounts)),
    delivery_type: Object.entries(deliveryTypeCounts).map(([slug, count]) => ({ slug, count })),
    day_part: Object.entries(dayPartCounts).map(([slug, count]) => ({ slug, count })),
    months: Object.entries(monthCounts).map(([slug, count]) => ({ slug, count })),
  }
}
