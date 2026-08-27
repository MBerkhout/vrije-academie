import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/** Reserved line-item metadata keys for promotion target rules (server-set only). */
export const EVENT_LINE_ITEM_METADATA_KEYS = {
  event_start_from: "event_start_from",
  event_start_until: "event_start_until",
  event_city_slug: "event_city_slug",
} as const

export type EventLineItemMetadataKey =
  (typeof EVENT_LINE_ITEM_METADATA_KEYS)[keyof typeof EVENT_LINE_ITEM_METADATA_KEYS]

const RESERVED_EVENT_METADATA_KEYS = new Set<string>(
  Object.values(EVENT_LINE_ITEM_METADATA_KEYS)
)

/** Strip client-supplied reserved keys so promotion conditions cannot be forged. */
export function stripReservedEventLineItemMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") {
    return {}
  }
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!RESERVED_EVENT_METADATA_KEYS.has(key)) {
      cleaned[key] = value
    }
  }
  return cleaned
}

/** Convert an event start timestamp to YYYYMMDD in Europe/Amsterdam. */
export function eventStartDateKey(startAt: string | Date): number {
  const date = typeof startAt === "string" ? new Date(startAt) : startAt
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value

  if (!year || !month || !day) {
    throw new Error("Failed to format event start date")
  }

  return Number(`${year}${month}${day}`)
}

type EventItemFacet = {
  start_at?: string | Date | null
  city_slug?: string | null
}

/**
 * Resolve event_item facets for a variant and return promotion-ready metadata.
 * Non-event variants return an empty object.
 */
export async function buildEventLineItemMetadata(
  scope: { resolve: (key: string) => unknown },
  variantId: string
): Promise<Record<string, unknown>> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: {
      entity: string
      fields: string[]
      filters: Record<string, unknown>
    }) => Promise<{ data: unknown[] }>
  }

  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "event_item.start_at", "event_item.city_slug"],
    filters: { id: variantId },
  })

  const variant = (data?.[0] ?? null) as { event_item?: EventItemFacet | null } | null
  const eventItem = variant?.event_item
  if (!eventItem) {
    return {}
  }

  const metadata: Record<string, unknown> = {}

  if (eventItem.start_at) {
    const dateKey = eventStartDateKey(eventItem.start_at)
    metadata[EVENT_LINE_ITEM_METADATA_KEYS.event_start_from] = dateKey
    metadata[EVENT_LINE_ITEM_METADATA_KEYS.event_start_until] = dateKey
  }

  if (eventItem.city_slug) {
    metadata[EVENT_LINE_ITEM_METADATA_KEYS.event_city_slug] = eventItem.city_slug
  }

  return metadata
}
