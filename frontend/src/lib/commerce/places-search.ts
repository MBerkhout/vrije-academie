import type { SearchSuggestion } from '@/lib/cms/types'
import { plpCityHref } from '@/lib/routes'

type CityFacet = { slug: string; label: string; count: number }

/** Map Medusa event city facets to storefront place suggestions (same source as Ons aanbod filters). */
export function cityFacetsToPlaceSuggestions(
  cities: CityFacet[],
  query: string,
  limit: number
): SearchSuggestion[] {
  const needle = query.trim().toLowerCase()
  let filtered = cities
  if (needle) {
    filtered = cities.filter(
      (c) =>
        c.label.toLowerCase().includes(needle) ||
        c.slug.toLowerCase().includes(needle)
    )
  }

  return filtered
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label, 'nl'))
    .slice(0, limit)
    .map((c) => ({
      kind: 'place' as const,
      title: c.label,
      href: plpCityHref(c.slug),
      subtitle: 'Plaats',
    }))
}
