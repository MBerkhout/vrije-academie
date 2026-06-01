import CatalogModuleService from "../modules/catalog/service"
import { citySlugFromLabel } from "./city-slug"

type CatalogService = InstanceType<typeof CatalogModuleService>

export type ResolvedCity = {
  slug: string
  label: string
  id: string
}

/**
 * Resolve a city label to a canonical catalog_city row, creating one when missing.
 */
export async function resolveOrCreateCity(
  catalog: CatalogService,
  rawLabel: string | null | undefined
): Promise<ResolvedCity | null> {
  const label = rawLabel?.trim()
  if (!label) return null

  const slug = citySlugFromLabel(label)
  if (!slug) return null

  const [existingBySlug] = await catalog.listCities({ slug })
  if (existingBySlug?.id) {
    return { id: existingBySlug.id, slug: existingBySlug.slug, label: existingBySlug.label }
  }

  const all = await catalog.listCities({}, { take: 1000 })
  const match = all.find(
    (c) => c.label.trim().toLowerCase() === label.toLowerCase()
  )
  if (match?.id) {
    return { id: match.id, slug: match.slug, label: match.label }
  }

  const created = await catalog.createCities({
    slug,
    label,
    sort_order: all.length,
  })
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) return null
  return { id: row.id, slug: row.slug, label: row.label }
}

/**
 * Apply city label to an event_item patch: sets city + city_slug from catalog.
 */
export async function applyCityToEventItemPatch(
  catalog: CatalogService,
  cityLabel: string | null | undefined
): Promise<{ city: string | null; city_slug: string | null }> {
  if (cityLabel === null || cityLabel === undefined || cityLabel.trim() === "") {
    return { city: null, city_slug: null }
  }
  const resolved = await resolveOrCreateCity(catalog, cityLabel)
  if (!resolved) return { city: cityLabel.trim(), city_slug: null }
  return { city: resolved.label, city_slug: resolved.slug }
}
