import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getPlpListingSnapshot, getRegistrationCountsByProduct } from "../../../lib/store-listing-snapshot"
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

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return []
  return (Array.isArray(val) ? val : [val]).flatMap((v) => v.split(",")).filter(Boolean)
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
  let list = [...snapshot.list]

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

  if (deliveryTypes.length) {
    list = list.filter((p) =>
      ((p.delivery_types ?? []) as string[]).some((dt) => deliveryTypes.includes(dt))
    )
  }

  if (citySlugs.length) {
    list = list.filter((p) =>
      ((p.cities ?? []) as CityRef[]).some((c) => citySlugs.includes(c.slug))
    )
  }

  if (dayParts.length) {
    list = list.filter(
      (p) => p.day_part_of_earliest && dayParts.includes(p.day_part_of_earliest as string)
    )
  }

  if (periodStart) {
    const from = new Date(periodStart).getTime()
    list = list.filter(
      (p) => p.earliest_start_at && new Date(p.earliest_start_at as string).getTime() >= from
    )
  }
  if (periodEnd) {
    const to = new Date(periodEnd).getTime()
    list = list.filter(
      (p) => p.earliest_start_at && new Date(p.earliest_start_at as string).getTime() <= to
    )
  }

  const facets = buildFacets(
    list,
    snapshot.catLinksAll,
    snapshot.docLinksAll,
    snapshot.eventGroupLinks
  )
  const count = list.length
  const registrationCounts =
    sort === "popularity" ? await getRegistrationCountsByProduct(req.scope) : null
  list = sortList(list, sort, relevanceRank, registrationCounts)
  list = list.slice(offset, offset + limit)

  setListingCacheHeaders(res)
  res.json({ events: list, count, facets })
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
  catLinks: { product_id: string; catalog_category?: { slug: string; label: string } | null }[],
  docLinks: { product_id: string; docent?: { slug: string; name: string } | null }[],
  eventGroupLinks: { product_id: string; event_group?: { record_type?: string } | null }[]
): Record<string, unknown> {
  const productIds = new Set(list.map((p) => p.id as string))

  const recordTypeCounts: Record<string, number> = {}
  for (const r of eventGroupLinks) {
    if (!productIds.has(r.product_id)) continue
    const rt = r.event_group?.record_type
    if (rt) recordTypeCounts[rt] = (recordTypeCounts[rt] ?? 0) + 1
  }

  const categoryCounts: Record<string, { slug: string; label: string; count: number }> = {}
  for (const row of catLinks) {
    if (!productIds.has(row.product_id) || !row.catalog_category) continue
    const slug = row.catalog_category.slug
    if (!categoryCounts[slug]) {
      categoryCounts[slug] = { slug, label: row.catalog_category.label, count: 0 }
    }
    categoryCounts[slug].count++
  }

  const docentCounts: Record<string, { slug: string; name: string; count: number }> = {}
  for (const row of docLinks) {
    if (!productIds.has(row.product_id) || !row.docent) continue
    const slug = row.docent.slug
    if (!docentCounts[slug]) {
      docentCounts[slug] = { slug, name: row.docent.name, count: 0 }
    }
    docentCounts[slug].count++
  }

  const cityCounts: Record<string, { slug: string; label: string; count: number }> = {}
  const deliveryTypeCounts: Record<string, number> = {}
  const dayPartCounts: Record<string, number> = {}
  const productTypeCounts: Record<string, { slug: string; label: string; count: number }> = {}

  for (const p of list) {
    incrementCityFacetCounts(cityCounts, (p.cities ?? []) as CityRef[])
    for (const dt of (p.delivery_types ?? []) as string[]) {
      deliveryTypeCounts[dt] = (deliveryTypeCounts[dt] ?? 0) + 1
    }
    const dp = p.day_part_of_earliest as string | undefined
    if (dp) dayPartCounts[dp] = (dayPartCounts[dp] ?? 0) + 1
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
    categories: Object.values(categoryCounts),
    docenten: Object.values(docentCounts),
    cities: sortCityFacetsByCount(Object.values(cityCounts)),
    delivery_type: Object.entries(deliveryTypeCounts).map(([slug, count]) => ({ slug, count })),
    day_part: Object.entries(dayPartCounts).map(([slug, count]) => ({ slug, count })),
  }
}
