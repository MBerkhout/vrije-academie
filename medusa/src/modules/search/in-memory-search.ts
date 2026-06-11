import type { CityRef } from "../../lib/city-refs"

/** Expanded substring fallback when OpenSearch is unavailable. */
export function productMatchesQuery(row: Record<string, unknown>, query: string): boolean {
  const lq = query.trim().toLowerCase()
  if (!lq) return true

  const parts: string[] = [
    String(row.title ?? ""),
    String(row.handle ?? ""),
    String(row.description ?? ""),
    String(row.record_type ?? ""),
    String(row.product_type ?? ""),
  ]

  for (const c of (row.categories ?? []) as { label?: string; slug?: string }[]) {
    if (c.label) parts.push(c.label)
    if (c.slug) parts.push(c.slug)
  }
  for (const d of (row.docenten ?? []) as { name?: string; slug?: string }[]) {
    if (d.name) parts.push(d.name)
    if (d.slug) parts.push(d.slug)
  }
  for (const c of (row.cities ?? []) as Array<string | CityRef>) {
    if (typeof c === "string") parts.push(c)
    else {
      if (c.label) parts.push(c.label)
      if (c.slug) parts.push(c.slug)
    }
  }
  for (const t of (row.tags ?? []) as { value?: string }[]) {
    if (t.value) parts.push(t.value)
  }

  const variants = (row.variants ?? []) as Record<string, unknown>[]
  for (const v of variants) {
    const ei = v.event_item as { location_name?: string | null; city?: string | null } | null
    if (ei?.location_name) parts.push(ei.location_name)
    if (ei?.city) parts.push(ei.city)
  }

  const metadata = (row.metadata ?? {}) as Record<string, unknown>
  for (const key of ["salesforce_subtitle", "salesforce_web_body", "salesforce_seo_description"]) {
    const raw = metadata[key]
    if (typeof raw === "string") parts.push(raw)
  }

  const haystack = parts.join(" ").toLowerCase()
  return haystack.includes(lq)
}

export function agendaItemMatchesQuery(
  item: {
    product_title?: string | null
    product_handle?: string | null
    categories?: unknown[]
    docenten?: unknown[]
    city?: string | null
    city_slug?: string | null
    variant_title?: string | null
  },
  query: string
): boolean {
  const lq = query.trim().toLowerCase()
  if (!lq) return true

  const parts = [
    item.product_title ?? "",
    item.product_handle ?? "",
    item.variant_title ?? "",
    item.city ?? "",
    item.city_slug ?? "",
  ]

  for (const c of (item.categories ?? []) as { label?: string; slug?: string }[]) {
    if (c.label) parts.push(c.label)
    if (c.slug) parts.push(c.slug)
  }
  for (const d of (item.docenten ?? []) as { name?: string; slug?: string }[]) {
    if (d.name) parts.push(d.name)
    if (d.slug) parts.push(d.slug)
  }

  return parts.join(" ").toLowerCase().includes(lq)
}
