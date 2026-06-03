import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getAgendaListingSnapshot,
  type AgendaOccurrenceRow,
} from "../../../lib/store-listing-snapshot"
import { sortCityFacetsByCount } from "../../../lib/city-refs"

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return []
  return (Array.isArray(val) ? val : [val]).flatMap((v) => v.split(",")).filter(Boolean)
}

function setListingCacheHeaders(res: MedusaResponse): void {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
}

/**
 * GET /store/agenda — flattened occurrence listing (one row per event_item).
 * Enrichment is served from a Redis-backed snapshot; this handler only filters, facets, sorts, paginates.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
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

  const snapshot = await getAgendaListingSnapshot(req.scope)
  const nowMs = Date.now()
  let items: AgendaOccurrenceRow[] = [...snapshot.items]

  if (recordTypes.length) {
    items = items.filter((it) => it.record_type && recordTypes.includes(it.record_type))
  }

  if (categorySlugs.length) {
    items = items.filter((it) =>
      (it.categories as { slug?: string }[]).some(
        (c) => c.slug && categorySlugs.includes(c.slug)
      )
    )
  }

  if (docentSlugs.length) {
    items = items.filter((it) =>
      (it.docenten as { slug?: string }[]).some((d) => d.slug && docentSlugs.includes(d.slug))
    )
  }

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
    const to = new Date(periodEnd).getTime() + 24 * 60 * 60 * 1000 - 1
    items = items.filter((it) => it.start_at && new Date(it.start_at).getTime() <= to)
  }
  if (dateOnly) {
    items = items.filter((it) => it.start_at && sameLocalDay(it.start_at, dateOnly))
  }

  const facets = buildFacets(items)
  items = items.map((it) => ({ ...it, status: deriveStatus(it) }))
  const count = items.length
  items = sortItems(items, sort)
  items = items.slice(offset, offset + limit)

  setListingCacheHeaders(res)
  res.json({ items, count, facets })
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

function sortItems(list: AgendaOccurrenceRow[], sort: string): AgendaOccurrenceRow[] {
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

function buildFacets(items: AgendaOccurrenceRow[]): Record<string, unknown> {
  const delivery: Record<string, number> = {}
  const cities: Record<string, { slug: string; label: string; count: number }> = {}
  const daypart: Record<string, number> = {}
  const categoriesMap: Record<string, { slug: string; label: string; count: number }> = {}
  const docentenMap: Record<string, { slug: string; name: string; count: number }> = {}
  const recordType: Record<string, number> = {}

  for (const it of items) {
    delivery[it.delivery_type] = (delivery[it.delivery_type] ?? 0) + 1
    if (it.city_slug) {
      const slug = it.city_slug
      const label = it.city ?? slug
      if (!cities[slug]) cities[slug] = { slug, label, count: 0 }
      cities[slug].count++
    }
    if (it.day_part) daypart[it.day_part] = (daypart[it.day_part] ?? 0) + 1
    if (it.record_type) recordType[it.record_type] = (recordType[it.record_type] ?? 0) + 1
    for (const c of it.categories as { slug?: string; label?: string }[]) {
      const slug = c.slug
      if (!slug) continue
      if (!categoriesMap[slug]) {
        categoriesMap[slug] = { slug, label: c.label ?? slug, count: 0 }
      }
      categoriesMap[slug].count++
    }
    for (const d of it.docenten as { slug?: string; name?: string }[]) {
      const slug = d.slug
      if (!slug) continue
      if (!docentenMap[slug]) {
        docentenMap[slug] = { slug, name: d.name ?? slug, count: 0 }
      }
      docentenMap[slug].count++
    }
  }

  return {
    record_type: Object.entries(recordType).map(([slug, count]) => ({ slug, count })),
    categories: Object.values(categoriesMap),
    docenten: Object.values(docentenMap),
    cities: sortCityFacetsByCount(Object.values(cities)),
    delivery_type: Object.entries(delivery).map(([slug, count]) => ({ slug, count })),
    day_part: Object.entries(daypart).map(([slug, count]) => ({ slug, count })),
  }
}
