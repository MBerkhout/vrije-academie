export type CityFacet = { slug: string; label: string; count: number }

/** Most matching products/events first; alphabetical tie-breaker. */
export function sortCityFacetsByCount<T extends CityFacet>(cities: T[]): T[] {
  return [...cities].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label, 'nl')
  })
}
