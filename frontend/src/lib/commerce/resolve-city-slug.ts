import { getCityBySlug, type CityOption } from '@/lib/cms/sanity-refs'
import { commerceClient } from '@/lib/commerce'

/** Resolve a city for PLP routes: Sanity mirror first, then Medusa event facets. */
export async function resolveCityBySlug(slug: string): Promise<CityOption | null> {
  const fromSanity = await getCityBySlug(slug)
  if (fromSanity) return fromSanity

  try {
    const { facets } = await commerceClient.getEventsPaginated({ limit: 1 })
    const match = facets.cities.find((c) => c.slug === slug)
    if (!match) return null
    return {
      _id: `medusa-city-${match.slug}`,
      slug: match.slug,
      label: match.label,
    }
  } catch {
    return null
  }
}
