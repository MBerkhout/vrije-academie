export type CountedFacet = { label: string; count: number }

export type CityFacet = CountedFacet & { slug: string }

/** Most matching products/events first; alphabetical tie-breaker. */
export function sortFacetsByCount<T extends CountedFacet>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label, 'nl')
  })
}

export function sortCityFacetsByCount<T extends CityFacet>(cities: T[]): T[] {
  return sortFacetsByCount(cities)
}
