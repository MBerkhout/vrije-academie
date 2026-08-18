import CatalogModuleService from "../modules/catalog/service"
import { locationSlugFromLabel } from "./location-slug"

type CatalogService = InstanceType<typeof CatalogModuleService>

export type ResolvedLocation = {
  id: string
  slug: string
  name: string
  city_slug: string | null
  room_name: string | null
}

export type LocationInput = {
  name: string
  citySlug?: string | null
  roomName?: string | null
  salesforceAccountId?: string | null
  salesforceRoomId?: string | null
}

function buildLocationSlug(input: LocationInput): string | null {
  const base = locationSlugFromLabel(input.name)
  if (!base) return null

  if (input.salesforceAccountId?.trim()) {
    return `${base}-sf-${input.salesforceAccountId.trim().slice(-6).toLowerCase()}`
  }

  if (input.citySlug?.trim()) {
    return `${base}-${input.citySlug.trim()}`
  }

  return base
}

/**
 * Resolve a venue to a canonical catalog_location row, creating one when missing.
 */
export async function resolveOrCreateLocation(
  catalog: CatalogService,
  input: LocationInput
): Promise<ResolvedLocation | null> {
  const name = input.name.trim()
  if (!name) return null

  const slug = buildLocationSlug(input)
  if (!slug) return null

  const citySlug = input.citySlug?.trim() || null
  const roomName = input.roomName?.trim() || null
  const salesforceAccountId = input.salesforceAccountId?.trim() || null
  const salesforceRoomId = input.salesforceRoomId?.trim() || null

  if (salesforceAccountId) {
    const all = await catalog.listLocations({}, { take: 5000 })
    const byAccount = all.find((row) => row.salesforce_account_id === salesforceAccountId)
    if (byAccount?.id) {
      const unchanged =
        byAccount.name === name &&
        (byAccount.city_slug ?? null) === citySlug &&
        (byAccount.room_name ?? null) === roomName &&
        (byAccount.salesforce_room_id ?? null) === salesforceRoomId

      if (!unchanged) {
        await catalog.updateLocations({
          id: byAccount.id,
          name,
          city_slug: citySlug,
          room_name: roomName,
          salesforce_room_id: salesforceRoomId,
        })
      }

      return {
        id: byAccount.id,
        slug: byAccount.slug,
        name,
        city_slug: citySlug,
        room_name: roomName,
      }
    }
  }

  const [existingBySlug] = await catalog.listLocations({ slug })
  if (existingBySlug?.id) {
    const unchanged =
      existingBySlug.name === name &&
      (existingBySlug.city_slug ?? null) === citySlug &&
      (existingBySlug.room_name ?? null) === roomName &&
      (existingBySlug.salesforce_account_id ?? null) === salesforceAccountId &&
      (existingBySlug.salesforce_room_id ?? null) === salesforceRoomId

    if (!unchanged) {
      await catalog.updateLocations({
        id: existingBySlug.id,
        name,
        city_slug: citySlug,
        room_name: roomName,
        salesforce_account_id: salesforceAccountId,
        salesforce_room_id: salesforceRoomId,
      })
    }

    return {
      id: existingBySlug.id,
      slug: existingBySlug.slug,
      name,
      city_slug: citySlug,
      room_name: roomName,
    }
  }

  const created = await catalog.createLocations({
    slug,
    name,
    city_slug: citySlug,
    room_name: roomName,
    salesforce_account_id: salesforceAccountId,
    salesforce_room_id: salesforceRoomId,
  })
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) return null

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city_slug: row.city_slug ?? null,
    room_name: row.room_name ?? null,
  }
}
