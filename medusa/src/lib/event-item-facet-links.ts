import type { MedusaContainer } from "@medusajs/framework/types"

import CatalogModuleService from "../modules/catalog/service"
import PeopleModuleService from "../modules/people/service"
import { type CityRef } from "./city-refs"

type EventItemRow = {
  id?: string
  catalog_city_id?: string | null
  catalog_location_id?: string | null
  docent_id?: string | null
}

export function collectEventItemIdsFromVariants(
  variants: Array<{ event_item?: EventItemRow | null }>
): string[] {
  return [
    ...new Set(
      variants
        .map((variant) => variant.event_item?.id)
        .filter(Boolean) as string[]
    ),
  ]
}

export async function loadFacetEntitiesForEventItems(
  scope: MedusaContainer,
  variants: Array<{ event_item?: EventItemRow | null }>
): Promise<{
  cityById: Map<string, { slug: string; label: string }>
  locationById: Map<
    string,
    { slug: string; name: string; city_slug?: string | null; room_name?: string | null }
  >
  docentById: Map<string, { slug: string; name: string }>
}> {
  const catalog = scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const people = scope.resolve("people") as InstanceType<typeof PeopleModuleService>

  const cityIds = new Set<string>()
  const locationIds = new Set<string>()
  const docentIds = new Set<string>()

  for (const variant of variants) {
    const eventItem = variant.event_item
    if (!eventItem) continue
    if (eventItem.catalog_city_id) cityIds.add(eventItem.catalog_city_id)
    if (eventItem.catalog_location_id) locationIds.add(eventItem.catalog_location_id)
    if (eventItem.docent_id) docentIds.add(eventItem.docent_id)
  }

  const [cities, locations, docents] = await Promise.all([
    cityIds.size ? catalog.listCities({ id: [...cityIds] }) : [],
    locationIds.size ? catalog.listLocations({ id: [...locationIds] }) : [],
    docentIds.size
      ? (await people.listDocents({ id: [...docentIds] })).filter(
          (docent) => docent.is_active !== false
        )
      : [],
  ])

  return {
    cityById: new Map(cities.map((city) => [city.id, { slug: city.slug, label: city.label }])),
    locationById: new Map(
      locations.map((location) => [
        location.id,
        {
          slug: location.slug,
          name: location.name,
          city_slug: location.city_slug,
          room_name: location.room_name,
        },
      ])
    ),
    docentById: new Map(
      docents.map((docent) => [docent.id, { slug: docent.slug, name: docent.name }])
    ),
  }
}

export function docentenByEventItemId(
  variants: Array<{ event_item?: EventItemRow | null }>,
  docentById: Map<string, { slug: string; name: string }>
): Record<string, { slug: string; name: string }[]> {
  const out: Record<string, { slug: string; name: string }[]> = {}
  for (const variant of variants) {
    const eventItem = variant.event_item
    if (!eventItem?.id || !eventItem.docent_id) continue
    const docent = docentById.get(eventItem.docent_id)
    if (!docent) continue
    ;(out[eventItem.id] ??= []).push(docent)
  }
  return out
}

export function cityRefsByEventItemId(
  variants: Array<{ event_item?: EventItemRow | null }>,
  cityById: Map<string, { slug: string; label: string }>
): Record<string, CityRef[]> {
  const out: Record<string, CityRef[]> = {}
  for (const variant of variants) {
    const eventItem = variant.event_item
    if (!eventItem?.id || !eventItem.catalog_city_id) continue
    const city = cityById.get(eventItem.catalog_city_id)
    if (!city) continue
    ;(out[eventItem.id] ??= []).push(city)
  }
  return out
}

export function locationsByEventItemId(
  variants: Array<{ event_item?: EventItemRow | null }>,
  locationById: Map<
    string,
    { slug: string; name: string; city_slug?: string | null; room_name?: string | null }
  >
): Record<
  string,
  { slug: string; name: string; city_slug?: string | null; room_name?: string | null }[]
> {
  const out: Record<
    string,
    { slug: string; name: string; city_slug?: string | null; room_name?: string | null }[]
  > = {}
  for (const variant of variants) {
    const eventItem = variant.event_item
    if (!eventItem?.id || !eventItem.catalog_location_id) continue
    const location = locationById.get(eventItem.catalog_location_id)
    if (!location) continue
    ;(out[eventItem.id] ??= []).push(location)
  }
  return out
}

export function mergeDocentenForProduct(
  productDocenten: unknown[],
  variants: Array<{ event_item?: EventItemRow | null }>,
  docentByEventItemId: Record<string, { slug: string; name: string }[]>
): unknown[] {
  const seen = new Set<string>()
  const merged: unknown[] = []

  for (const docent of productDocenten) {
    const slug = (docent as { slug?: string }).slug
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    merged.push(docent)
  }

  for (const variant of variants) {
    const eventItemId = variant.event_item?.id
    if (!eventItemId) continue
    for (const docent of docentByEventItemId[eventItemId] ?? []) {
      if (seen.has(docent.slug)) continue
      seen.add(docent.slug)
      merged.push(docent)
    }
  }

  return merged
}

export function uniqueLocationsForVariants(
  variants: Array<{ event_item?: EventItemRow | null }>,
  locationByEventItemId: Record<
    string,
    { slug: string; name: string; city_slug?: string | null; room_name?: string | null }[]
  >
): { slug: string; name: string; city_slug?: string | null; room_name?: string | null }[] {
  const seen = new Set<string>()
  const out: {
    slug: string
    name: string
    city_slug?: string | null
    room_name?: string | null
  }[] = []
  for (const variant of variants) {
    const eventItemId = variant.event_item?.id
    if (!eventItemId) continue
    for (const location of locationByEventItemId[eventItemId] ?? []) {
      if (seen.has(location.slug)) continue
      seen.add(location.slug)
      out.push(location)
    }
  }
  return out
}

export function mergeCityRefsForProduct(
  eventItemCities: CityRef[],
  variants: Array<{ event_item?: EventItemRow | null }>,
  cityByEventItemId: Record<string, CityRef[]>
): CityRef[] {
  const seen = new Set<string>()
  const merged: CityRef[] = []

  for (const city of eventItemCities) {
    if (seen.has(city.slug)) continue
    seen.add(city.slug)
    merged.push(city)
  }

  for (const variant of variants) {
    const eventItemId = variant.event_item?.id
    if (!eventItemId) continue
    for (const city of cityByEventItemId[eventItemId] ?? []) {
      if (seen.has(city.slug)) continue
      seen.add(city.slug)
      merged.push(city)
    }
  }

  return merged
}

export function eventItemDocentLinksForProducts(
  variants: Array<{ id?: string; event_item?: EventItemRow | null }>,
  docentByEventItemId: Record<string, { slug: string; name: string }[]>,
  variantIdToProductId: Record<string, string>
): Array<{ product_id: string; docent?: { slug: string; name: string } | null }> {
  const out: Array<{ product_id: string; docent?: { slug: string; name: string } | null }> = []
  for (const variant of variants) {
    const eventItemId = variant.event_item?.id
    const productId = variant.id ? variantIdToProductId[variant.id] : undefined
    if (!eventItemId || !productId) continue
    for (const docent of docentByEventItemId[eventItemId] ?? []) {
      out.push({ product_id: productId, docent })
    }
  }
  return out
}
