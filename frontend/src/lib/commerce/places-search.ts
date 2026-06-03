import type { SearchSuggestion } from '@/lib/cms/types'
import { plpCityHref } from '@/lib/routes'
import { sortCityFacetsByCount, type CityFacet } from '@/lib/commerce/city-facets'

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

  return sortCityFacetsByCount(filtered)
    .slice(0, limit)
    .map((c) => ({
      kind: 'place' as const,
      title: c.label,
      href: plpCityHref(c.slug),
      subtitle: 'Plaats',
    }))
}
