import { getCityBySlug, type CityOption } from '@/lib/cms/sanity-refs'
import { commerceClient } from '@/lib/commerce'

type CityLabelOption = { slug: string; label?: string | null }

/** Display label for a city slug (facet lookup, then title-case fallback). */
export function cityLabelFromSlug(
  slug: string,
  options?: CityLabelOption[]
): string {
  const match = options?.find((c) => c.slug === slug)
  if (match?.label) return match.label
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

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
