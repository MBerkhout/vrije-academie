import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../../../links/product-docenten"
import productEventGroupLink from "../../../links/product-event-group"
import CatalogModuleService from "../../../modules/catalog/service"
import { buildCityLabelMap, cityRefFromEventItem } from "../../../lib/city-refs"
import { listProductCatalogCategoryLinks } from "../../../lib/product-catalog-category-links"
import { filterStoreListingProductIds } from "../../../lib/store-listing-eligibility"
import { medusaMajorToCents } from "../../../lib/medusa-price-to-cents"

/**
 * GET /store/agenda
 *
 * Returns a **flattened, paginated list of scheduled event occurrences**
 * (one row per `event_item`) for the Agenda page.
 *
 * Contrast with `GET /store/events` which returns one row per product.
 *
 * Query params (all optional, all arrays support comma-separated values):
 *   q              – free-text (ILIKE on product title/handle/description)
 *   record_type[]  – collegereeks | lezing | excursie | studiedag
 *   delivery_type[]– online | offline | pre_recorded
 *   category[]     – catalog_category slug
 *   docent[]       – docent slug
 *   city[]         – catalog_city slug on event_item
 *   day_part[]     – ochtend | middag | avond (derived from start_at hour)
 *   period_start   – ISO date: only include items with start_at >= this
 *   period_end     – ISO date: only include items with start_at <= this
 *   date           – ISO date (YYYY-MM-DD): only items on that exact day
 *   include_past   – "true" to include occurrences before now (default excluded)
 *   sort           – start_date (asc) | start_date_desc | price_asc | price_desc
 *   limit          – page size (default 24, max 100)
 *   offset         – pagination offset (default 0)
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
  const deliveryTypes = parseArrayParam(q.delivery_type as string | string[])
  const categorySlugs = parseArrayParam(q.category as string | string[])
  const docentSlugs = parseArrayParam(q.docent as string | string[])
  const citySlugs = parseArrayParam(q.city as string | string[])
  const dayParts = parseArrayParam(q.day_part as string | string[])
  const periodStart = typeof q.period_start === "string" ? q.period_start : null
  const periodEnd = typeof q.period_end === "string" ? q.period_end : null
  const dateOnly = typeof q.date === "string" ? q.date : null
  const includePast = q.include_past === "true" || q.include_past === "1"
  const sort = typeof q.sort === "string" ? q.sort : "start_date"
  const limit = Math.min(Math.max(1, Number(q.limit) || 24), 100)
  const offset = Math.max(0, Number(q.offset) || 0)

  // --- Step 1: Determine eligible product ids (record_type, category, docent filters) ---
  const [{ data: allProducts }, { data: eventGroupLinks }] = await Promise.all([
    query.graph({ entity: "product", fields: ["id", "handle"] }),
    query.graph({
      entity: productEventGroupLink.entryPoint,
      fields: ["product_id", "event_group_id", "event_group.*"],
    }),
  ])

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

  // #region agent log
  const _dbgSherGil = eligibleProductIds
    .map((id) => ({ id, handle: productHandleById[id], eg: eventGroupByProduct[id] }))
    .filter((r) => r.handle?.includes("sher-gil"))
  fetch("http://127.0.0.1:7397/ingest/95d10c99-ac39-4827-a636-26ce82ef70b6", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "65697a" },
    body: JSON.stringify({
      sessionId: "65697a",
      runId: "post-fix",
      hypothesisId: "A",
      location: "agenda/route.ts:eligibility",
      message: "agenda product eligibility after shared filter",
      data: {
        sherGilEligible: _dbgSherGil.length > 0,
        sherGilRows: _dbgSherGil,
        eligibleCount: eligibleProductIds.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  if (recordTypes.length) {
    eligibleProductIds = eligibleProductIds.filter((id) => {
      const eg = eventGroupByProduct[id]
      return eg && recordTypes.includes(eg.record_type)
    })
  }

  if (!eligibleProductIds.length) {
    res.json({ items: [], count: 0, facets: emptyFacets() })
    return
  }

  if (categorySlugs.length) {
    const catLinks = await listProductCatalogCategoryLinks(req.scope, {
      product_id: eligibleProductIds,
    })
    const matching = new Set<string>()
    for (const row of catLinks) {
      if (row.catalog_category && categorySlugs.includes(row.catalog_category.slug)) {
        matching.add(row.product_id)
      }
    }
    eligibleProductIds = eligibleProductIds.filter((id) => matching.has(id))
    if (!eligibleProductIds.length) {
      res.json({ items: [], count: 0, facets: emptyFacets() })
      return
    }
  }

  if (docentSlugs.length) {
    const { data: docLinks } = await query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: eligibleProductIds },
    })
    const matching = new Set<string>()
    for (const row of docLinks ?? []) {
      const r = row as any
      if (r.docent && docentSlugs.includes(r.docent.slug)) {
        matching.add(r.product_id)
      }
    }
    eligibleProductIds = eligibleProductIds.filter((id) => matching.has(id))
    if (!eligibleProductIds.length) {
      res.json({ items: [], count: 0, facets: emptyFacets() })
      return
    }
  }

  // --- Step 2: Fetch product + variants + event_items for eligible products ---
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

  // --- Step 3: Fetch category + docent links for lookup ---
  const [catLinksAll, { data: docLinksAll }] = await Promise.all([
    listProductCatalogCategoryLinks(req.scope, { product_id: eligibleProductIds }),
    query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.*"],
      filters: { product_id: eligibleProductIds },
    }),
  ])

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

  // --- Step 4: Flatten to one row per event_item ---
  const nowMs = Date.now()
  let items = (products ?? []).flatMap((product: any) => {
    const variants = (product.variants ?? []) as any[]
    const categories = categoryByProduct[product.id] ?? []
    const docenten = docentByProduct[product.id] ?? []
    const productTagValues = (product.tags ?? [])
      .map((t: any) => (t?.value ?? "").toString())
      .filter(Boolean) as string[]
    const hasExclusiefTag = productTagValues.some((t) =>
      t.toLowerCase().includes("exclusief")
    )

    return variants
      .filter((v: any) => v.event_item)
      .map((v: any) => {
        const ei = v.event_item
        const priceCents =
          Array.isArray(v.prices) && v.prices.length
            ? Math.min(...v.prices.map((p: any) => medusaMajorToCents(Number(p?.amount ?? 0))).filter((n: number) => n > 0))
            : null

        const cityRef = cityRefFromEventItem(ei, cityLabelMap)

        return {
          id: ei.id as string,
          variant_id: v.id as string,
          product_id: product.id as string,
          product_handle: product.handle as string,
          product_title: product.title as string,
          thumbnail: product.thumbnail ?? null,
          record_type: eventGroupByProduct[product.id]?.record_type ?? null,
          categories,
          docenten,
          tags: product.tags ?? [],
          has_exclusief_tag: hasExclusiefTag,
          variant_title: v.title ?? null,
          delivery_type: ei.delivery_type as string,
          city: cityRef?.label ?? ei.city ?? null,
          city_slug: cityRef?.slug ?? ei.city_slug ?? null,
          start_at: ei.start_at ?? null,
          end_at: ei.end_at ?? null,
          available_quantity: Number(ei.available_quantity ?? 0),
          is_free_trial: !!ei.is_free_trial,
          registration_deadline_at: ei.registration_deadline_at ?? null,
          price: priceCents && priceCents > 0 ? priceCents : null,
          day_part: dayPart(ei.start_at),
        }
      })
  })

  // --- Step 5: Apply occurrence-level filters ---
  // future-only (default)
  if (!includePast) {
    items = items.filter((it) => it.start_at && new Date(it.start_at).getTime() >= nowMs)
  }

  if (searchQ) {
    const lq = searchQ.toLowerCase()
    items = items.filter(
      (it) =>
        (it.product_title ?? "").toLowerCase().includes(lq) ||
        (it.product_handle ?? "").toLowerCase().includes(lq)
    )
  }

  if (deliveryTypes.length) {
    items = items.filter((it) => deliveryTypes.includes(it.delivery_type))
  }
  if (citySlugs.length) {
    items = items.filter((it) => it.city_slug && citySlugs.includes(it.city_slug))
  }
  if (dayParts.length) {
    items = items.filter((it) => it.day_part && dayParts.includes(it.day_part))
  }
  if (periodStart) {
    const from = new Date(periodStart).getTime()
    items = items.filter((it) => it.start_at && new Date(it.start_at).getTime() >= from)
  }
  if (periodEnd) {
    // inclusive end-of-day
    const to = new Date(periodEnd).getTime() + 24 * 60 * 60 * 1000 - 1
    items = items.filter((it) => it.start_at && new Date(it.start_at).getTime() <= to)
  }
  if (dateOnly) {
    items = items.filter((it) => it.start_at && sameLocalDay(it.start_at, dateOnly))
  }

  // --- Step 6: Build facets before pagination ---
  const facets = buildFacets(items)

  // --- Step 7: Derive button state per row ---
  items = items.map((it) => ({ ...it, status: deriveStatus(it) }))

  const count = items.length

  // --- Step 8: Sort ---
  items = sortItems(items, sort)

  // --- Step 9: Paginate ---
  items = items.slice(offset, offset + limit)

  res.json({ items, count, facets })
}

// ---------- Helpers ----------

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return []
  return (Array.isArray(val) ? val : [val]).flatMap((v) => v.split(",")).filter(Boolean)
}

function dayPart(startAt: string | null | undefined): string | null {
  if (!startAt) return null
  const hour = new Date(startAt).getHours()
  if (hour < 12) return "ochtend"
  if (hour < 17) return "middag"
  return "avond"
}

function sameLocalDay(iso: string, ymd: string): boolean {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}` === ymd
}

type AgendaStatus = "open" | "almost_full" | "waitlist" | "exclusief"

function deriveStatus(it: {
  available_quantity: number
  has_exclusief_tag: boolean
}): AgendaStatus {
  if (it.has_exclusief_tag) return "exclusief"
  if (!it.available_quantity || it.available_quantity <= 0) return "waitlist"
  if (it.available_quantity <= 3) return "almost_full"
  return "open"
}

function sortItems(list: any[], sort: string): any[] {
  const sorted = [...list]
  switch (sort) {
    case "start_date_desc":
      sorted.sort(
        (a, b) =>
          (b.start_at ? new Date(b.start_at).getTime() : -Infinity) -
          (a.start_at ? new Date(a.start_at).getTime() : -Infinity)
      )
      break
    case "price_asc":
      sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
      break
    case "price_desc":
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
      break
    case "start_date":
    default:
      sorted.sort(
        (a, b) =>
          (a.start_at ? new Date(a.start_at).getTime() : Infinity) -
          (b.start_at ? new Date(b.start_at).getTime() : Infinity)
      )
      break
  }
  return sorted
}

function buildFacets(items: any[]): Record<string, any> {
  const delivery: Record<string, number> = {}
  const cities: Record<string, { slug: string; label: string; count: number }> = {}
  const daypart: Record<string, number> = {}
  const categoriesMap: Record<string, { slug: string; label: string; count: number }> = {}
  const docentenMap: Record<string, { slug: string; name: string; count: number }> = {}
  const recordType: Record<string, number> = {}

  for (const it of items) {
    delivery[it.delivery_type] = (delivery[it.delivery_type] ?? 0) + 1
    if (it.city_slug) {
      const slug = it.city_slug as string
      const label = (it.city as string) ?? slug
      if (!cities[slug]) cities[slug] = { slug, label, count: 0 }
      cities[slug].count++
    }
    if (it.day_part) daypart[it.day_part] = (daypart[it.day_part] ?? 0) + 1
    if (it.record_type) recordType[it.record_type] = (recordType[it.record_type] ?? 0) + 1
    for (const c of it.categories ?? []) {
      const slug = c.slug as string
      if (!slug) continue
      if (!categoriesMap[slug]) categoriesMap[slug] = { slug, label: c.label, count: 0 }
      categoriesMap[slug].count++
    }
    for (const d of it.docenten ?? []) {
      const slug = d.slug as string
      if (!slug) continue
      if (!docentenMap[slug]) docentenMap[slug] = { slug, name: d.name, count: 0 }
      docentenMap[slug].count++
    }
  }

  return {
    record_type: Object.entries(recordType).map(([slug, count]) => ({ slug, count })),
    categories: Object.values(categoriesMap),
    docenten: Object.values(docentenMap),
    cities: Object.values(cities),
    delivery_type: Object.entries(delivery).map(([slug, count]) => ({ slug, count })),
    day_part: Object.entries(daypart).map(([slug, count]) => ({ slug, count })),
  }
}

function emptyFacets() {
  return { record_type: [], categories: [], docenten: [], cities: [], delivery_type: [], day_part: [] }
}
