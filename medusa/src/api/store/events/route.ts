import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../../../links/product-docenten"
import productEventGroupLink from "../../../links/product-event-group"
import CatalogModuleService from "../../../modules/catalog/service"
import { filterStoreListingProductIds } from "../../../lib/store-listing-eligibility"
import { getBaseEventData } from "../../../lib/store-query-cache"
import {
  buildCityLabelMap,
  uniqueCityRefsFromEventItems,
  incrementCityFacetCounts,
  sortCityFacetsByCount,
  type CityRef,
} from "../../../lib/city-refs"
import { listProductCatalogCategoryLinks } from "../../../lib/product-catalog-category-links"
import { minPriceCentsFromVariants } from "../../../lib/medusa-price-to-cents"
import {
  futureOfflineSessionsForListing,
  productEligibleForEventsListing,
} from "../../../lib/event-session-eligibility"
import { productTypeMatchesFilter, productTypeToSlug } from "../../../lib/plp-product-types"

/** day_part derived from start_at hour: ochtend <12, middag 12–17, avond >=17 */
function dayPart(startAt: string | null | undefined): string | null {
  if (!startAt) return null
  const hour = new Date(startAt).getHours()
  if (hour < 12) return "ochtend"
  if (hour < 17) return "middag"
  return "avond"
}

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return []
  return (Array.isArray(val) ? val : [val]).flatMap((v) => v.split(",")).filter(Boolean)
}

/**
 * GET /store/events
 *
 * Query params:
 *   q              – free-text (ILIKE title/handle)
 *   record_type[]  – collegereeks | lezing | excursie | studiedag
 *   product_type[] – reis | studiedag | wandeling | workshop (Medusa product.type)
 *   delivery_type[]– online | offline | pre_recorded
 *   category[]     – catalog_category slug
 *   docent[]       – docent slug
 *   city[]         – catalog_city slug on event_item
 *   day_part[]     – ochtend | middag | avond (derived from start_at)
 *   period_start   – ISO date: only include items with start_at >= this
 *   period_end     – ISO date: only include items with start_at <= this
 *   property[key]  – filter by product/variant property value (legacy)
 *   sort           – relevance | newest | start_date | popularity | price_asc | price_desc
 *   limit          – page size (default 24)
 *   offset         – pagination offset (default 0)
 *
 * On-site (offline) sessions in the past are excluded from the listing and from
 * city / day_part / earliest_start_at aggregates. Online and pre_recorded products
 * are not date-filtered at product level.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const catalogCities = await catalog.listCities({}, { order: { sort_order: "ASC" } })
  const cityLabelMap = buildCityLabelMap(catalogCities)
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
  const sort = typeof q.sort === "string" ? q.sort : "start_date"
  const limit = Math.min(Math.max(1, Number(q.limit) || 24), 100)
  const offset = Math.max(0, Number(q.offset) || 0)

  // parse property[key]=value filters (legacy)
  const propertyFilters: Record<string, string> = {}
  for (const [key, raw] of Object.entries(q)) {
    const m = key.match(/^property\[(.+)\]$/)
    if (!m) continue
    const v = Array.isArray(raw) ? raw[0] : raw
    if (typeof v === "string" && v) propertyFilters[m[1]] = v
  }

  // --- Step 1: Fetch all products + EventGroup links (cached 60 s) ---
  const { allProducts, eventGroupLinks } = await getBaseEventData(
    query,
    productEventGroupLink.entryPoint
  )

  // Build product_id → event_group map
  const eventGroupByProduct: Record<string, any> = {}
  for (const r of eventGroupLinks ?? []) {
    const row = r as any
    if (row.product_id) eventGroupByProduct[row.product_id] = row.event_group ?? null
  }

  const productHandleById: Record<string, string | undefined> = {}
  for (const p of allProducts ?? []) {
    const row = p as { id?: string; handle?: string }
    if (row.id) productHandleById[row.id] = row.handle
  }

  let eligibleProductIds = filterStoreListingProductIds(
    (allProducts ?? []).map((p: any) => p.id as string).filter(Boolean),
    productHandleById,
    eventGroupByProduct
  )

  // Apply record_type filter (only products with a matching EventGroup record_type)
  if (recordTypes.length) {
    eligibleProductIds = eligibleProductIds.filter((id) => {
      const eg = eventGroupByProduct[id]
      return eg && recordTypes.includes(eg.record_type)
    })
  }

  if (!eligibleProductIds.length) {
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
    res.json({ events: [], count: 0, facets: emptyFacets() })
    return
  }

  // --- Step 2: Filter by category slugs ---
  if (categorySlugs.length) {
    const catLinks = await listProductCatalogCategoryLinks(req.scope, {
      product_id: eligibleProductIds,
    })
    const matchingProductIds = new Set<string>()
    for (const row of catLinks) {
      if (row.catalog_category && categorySlugs.includes(row.catalog_category.slug)) {
        matchingProductIds.add(row.product_id)
      }
    }
    eligibleProductIds = eligibleProductIds.filter((id) => matchingProductIds.has(id))
    if (!eligibleProductIds.length) {
      res.json({ events: [], count: 0, facets: emptyFacets() })
      return
    }
  }

  // --- Step 3: Filter by docent slugs ---
  if (docentSlugs.length) {
    const { data: docLinks } = await query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: eligibleProductIds },
    })
    const matchingProductIds = new Set<string>()
    for (const row of docLinks ?? []) {
      const r = row as any
      if (r.docent && docentSlugs.includes(r.docent.slug)) {
        matchingProductIds.add(r.product_id)
      }
    }
    eligibleProductIds = eligibleProductIds.filter((id) => matchingProductIds.has(id))
    if (!eligibleProductIds.length) {
      res.json({ events: [], count: 0, facets: emptyFacets() })
      return
    }
  }

  // --- Step 4: Fetch full product data ---
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "handle", "description", "thumbnail", "status",
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

  // --- Step 5: Fetch category + docent links for returned products ---
  const [catLinksAll, { data: docLinksAll }] = await Promise.all([
    listProductCatalogCategoryLinks(req.scope, { product_id: eligibleProductIds }),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: eligibleProductIds },
    }),
  ])

  // Build lookup maps
  const categoryByProduct: Record<string, any[]> = {}
  for (const row of catLinksAll) {
    if (!row.product_id || !row.catalog_category) continue
    ;(categoryByProduct[row.product_id] ??= []).push(row.catalog_category)
  }
  const docentByProduct: Record<string, any[]> = {}
  for (const row of docLinksAll ?? []) {
    const r = row as any
    if (!r.product_id || !r.docent) continue
    ;(docentByProduct[r.product_id] ??= []).push(r.docent)
  }

  // --- Step 6: Build enriched + filtered list ---
  type ProductRow = Record<string, any>
  let list = (products ?? []) as ProductRow[]

  // property filters (legacy)
  if (Object.keys(propertyFilters).length) {
    list = list.filter((p) => {
      const productProps = propertyMapFromRows(p.properties ?? [])
      const variantPropsList = (p.variants ?? []).map((v: any) => propertyMapFromRows(v.properties ?? []))
      return matchesPropertyFilters(productProps, variantPropsList, propertyFilters)
    })
  }

  // free-text filter
  if (searchQ) {
    const lq = searchQ.toLowerCase()
    list = list.filter(
      (p) =>
        (p.title ?? "").toLowerCase().includes(lq) ||
        (p.handle ?? "").toLowerCase().includes(lq) ||
        (p.description ?? "").toLowerCase().includes(lq)
    )
  }

  const listingNow = new Date()

  // Enrich each product with computed fields
  list = list.map((p) => {
    const variants = (p.variants ?? []) as ProductRow[]
    const eventItems = variants.map((v) => v.event_item).filter(Boolean)
    const futureOfflineItems = futureOfflineSessionsForListing(eventItems, listingNow)

    const earliestStartAt = futureOfflineItems
      .map((ei: any) => ei?.start_at)
      .filter(Boolean)
      .sort()[0] ?? null

    const cities = uniqueCityRefsFromEventItems(futureOfflineItems, cityLabelMap)

    const deliveryTypesOnProduct = [...new Set(
      eventItems.map((ei: any) => ei?.delivery_type).filter(Boolean)
    )] as string[]

    const priceFrom = minPriceCentsFromVariants(variants)

    const minAvailableQty = eventItems.length
      ? Math.min(...eventItems.map((ei: any) => Number(ei?.available_quantity ?? 0)))
      : null

    return {
      ...p,
      record_type: eventGroupByProduct[p.id]?.record_type ?? null,
      product_type: (p.type as { value?: string } | null | undefined)?.value ?? null,
      categories: categoryByProduct[p.id] ?? [],
      docenten: docentByProduct[p.id] ?? [],
      cities,
      delivery_types: deliveryTypesOnProduct,
      earliest_start_at: earliestStartAt,
      day_part_of_earliest: dayPart(earliestStartAt),
      price_from: priceFrom,
      min_available_quantity: minAvailableQty,
    }
  })

  // Drop on-site-only products whose physical sessions are all in the past
  list = list.filter((p) => {
    const eventItems = (p.variants ?? []).map((v: any) => v.event_item).filter(Boolean)
    return productEligibleForEventsListing(eventItems, listingNow)
  })

  // product_type filter (Salesforce record type on Medusa product.type)
  if (productTypes.length) {
    list = list.filter((p) =>
      productTypeMatchesFilter(
        (p.type as { value?: string } | null | undefined)?.value ?? p.product_type,
        productTypes
      )
    )
  }

  // delivery_type filter
  if (deliveryTypes.length) {
    list = list.filter((p) =>
      p.delivery_types.some((dt: string) => deliveryTypes.includes(dt))
    )
  }

  // city filter (canonical slug)
  if (citySlugs.length) {
    list = list.filter((p) =>
      (p.cities as CityRef[]).some((c) => citySlugs.includes(c.slug))
    )
  }

  // day_part filter
  if (dayParts.length) {
    list = list.filter((p) => p.day_part_of_earliest && dayParts.includes(p.day_part_of_earliest))
  }

  // period filter
  if (periodStart) {
    const from = new Date(periodStart).getTime()
    list = list.filter((p) => p.earliest_start_at && new Date(p.earliest_start_at).getTime() >= from)
  }
  if (periodEnd) {
    const to = new Date(periodEnd).getTime()
    list = list.filter((p) => p.earliest_start_at && new Date(p.earliest_start_at).getTime() <= to)
  }

  // --- Step 7: Build facets before pagination ---
  const facets = buildFacets(list, catLinksAll, docLinksAll ?? [], eventGroupLinks ?? [])

  const count = list.length

  // --- Step 8: Sort ---
  list = sortList(list, sort, searchQ)

  // --- Step 9: Paginate ---
  list = list.slice(offset, offset + limit)

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
  res.json({ events: list, count, facets })
}

// --- Helpers ---

function propertyMapFromRows(rows: unknown[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const row of rows) {
    const p = (row as { property?: { key?: string; value?: string } })?.property
    if (p?.key && p?.value !== undefined) map[p.key] = p.value
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

function sortList(list: Record<string, any>[], sort: string, searchQ: string): Record<string, any>[] {
  const sorted = [...list]
  switch (sort) {
    case "newest":
      sorted.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      break
    case "price_asc":
      sorted.sort((a, b) => (a.price_from ?? Infinity) - (b.price_from ?? Infinity))
      break
    case "price_desc":
      sorted.sort((a, b) => (b.price_from ?? 0) - (a.price_from ?? 0))
      break
    case "start_date":
    default:
      sorted.sort((a, b) => {
        const aDate = a.earliest_start_at ? new Date(a.earliest_start_at).getTime() : Infinity
        const bDate = b.earliest_start_at ? new Date(b.earliest_start_at).getTime() : Infinity
        return aDate - bDate
      })
      break
  }
  return sorted
}

function buildFacets(
  list: Record<string, any>[],
  catLinks: any[],
  docLinks: any[],
  eventGroupLinks: any[]
): Record<string, any> {
  const productIds = new Set(list.map((p) => p.id as string))

  // record_type facet
  const recordTypeCounts: Record<string, number> = {}
  for (const r of eventGroupLinks) {
    if (!productIds.has(r.product_id)) continue
    const rt = r.event_group?.record_type
    if (rt) recordTypeCounts[rt] = (recordTypeCounts[rt] ?? 0) + 1
  }

  // category facet
  const categoryCounts: Record<string, { slug: string; label: string; count: number }> = {}
  for (const row of catLinks) {
    const r = row as any
    if (!productIds.has(r.product_id) || !r.catalog_category) continue
    const slug = r.catalog_category.slug as string
    if (!categoryCounts[slug]) {
      categoryCounts[slug] = { slug, label: r.catalog_category.label, count: 0 }
    }
    categoryCounts[slug].count++
  }

  // docent facet
  const docentCounts: Record<string, { slug: string; name: string; count: number }> = {}
  for (const row of docLinks) {
    const r = row as any
    if (!productIds.has(r.product_id) || !r.docent) continue
    const slug = r.docent.slug as string
    if (!docentCounts[slug]) {
      docentCounts[slug] = { slug, name: r.docent.name, count: 0 }
    }
    docentCounts[slug].count++
  }

  // city + delivery_type + day_part + product_type from list
  const cityCounts: Record<string, { slug: string; label: string; count: number }> = {}
  const deliveryTypeCounts: Record<string, number> = {}
  const dayPartCounts: Record<string, number> = {}
  const productTypeCounts: Record<string, { slug: string; label: string; count: number }> = {}

  for (const p of list) {
    incrementCityFacetCounts(cityCounts, p.cities ?? [])
    for (const dt of p.delivery_types ?? []) deliveryTypeCounts[dt] = (deliveryTypeCounts[dt] ?? 0) + 1
    const dp = p.day_part_of_earliest
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

function emptyFacets() {
  return {
    record_type: [],
    product_type: [],
    categories: [],
    docenten: [],
    cities: [],
    delivery_type: [],
    day_part: [],
  }
}
