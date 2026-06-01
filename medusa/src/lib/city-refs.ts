import { citySlugFromLabel } from "./city-slug"

export type CityRef = { slug: string; label: string }

export type CityLabelMap = Map<string, string>

export function buildCityLabelMap(
  catalogCities: { slug: string; label: string }[]
): CityLabelMap {
  const map = new Map<string, string>()
  for (const c of catalogCities) {
    if (c.slug) map.set(c.slug, c.label)
  }
  return map
}

/** Resolve canonical slug + label from an event_item row. */
export function cityRefFromEventItem(
  ei: { city?: string | null; city_slug?: string | null },
  labelMap: CityLabelMap
): CityRef | null {
  const slug =
    ei.city_slug?.trim() ||
    (ei.city?.trim() ? citySlugFromLabel(ei.city) : "")
  if (!slug) return null
  const label = labelMap.get(slug) ?? ei.city?.trim() ?? slug
  return { slug, label }
}

/** Unique city refs for a product's event items. */
export function uniqueCityRefsFromEventItems(
  eventItems: { city?: string | null; city_slug?: string | null }[],
  labelMap: CityLabelMap
): CityRef[] {
  const seen = new Set<string>()
  const out: CityRef[] = []
  for (const ei of eventItems) {
    const ref = cityRefFromEventItem(ei, labelMap)
    if (!ref || seen.has(ref.slug)) continue
    seen.add(ref.slug)
    out.push(ref)
  }
  return out
}

export function incrementCityFacetCounts(
  counts: Record<string, { slug: string; label: string; count: number }>,
  refs: CityRef[]
): void {
  for (const ref of refs) {
    if (!counts[ref.slug]) {
      counts[ref.slug] = { slug: ref.slug, label: ref.label, count: 0 }
    }
    counts[ref.slug].count++
  }
}
