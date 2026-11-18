import type { MedusaContainer } from "@medusajs/framework/types"

import EventsModuleService from "../modules/events/service"

export type StoreEventItemSessionDate = {
  start_at: string
  end_at: string | null
}

/** Remove URLs that are only for my-account / post-purchase. */
export function stripPrivateEventItemFields(
  eventItem: Record<string, unknown>
): Record<string, unknown> {
  const { live_url: _live, recording_url: _recording, ...rest } = eventItem
  return rest
}

export async function publicSessionDatesByEventItemId(
  scope: MedusaContainer,
  eventItemIds: string[]
): Promise<Map<string, StoreEventItemSessionDate[]>> {
  const out = new Map<string, StoreEventItemSessionDate[]>()
  const uniqueIds = [...new Set(eventItemIds.filter(Boolean))]
  if (!uniqueIds.length) return out

  const events = scope.resolve("events") as InstanceType<typeof EventsModuleService>

  for (const eventItemId of uniqueIds) {
    const rows = await events.listEventItemDates(
      { event_item_id: eventItemId },
      { take: 200, order: { sequence: "ASC" } }
    )
    const dates: StoreEventItemSessionDate[] = []
    for (const row of rows) {
      if (!row.start_at) continue
      dates.push({
        start_at: new Date(row.start_at).toISOString(),
        end_at: row.end_at ? new Date(row.end_at).toISOString() : null,
      })
    }
    if (dates.length) out.set(eventItemId, dates)
  }

  return out
}