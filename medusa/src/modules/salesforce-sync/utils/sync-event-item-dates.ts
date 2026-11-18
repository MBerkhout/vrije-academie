import type EventsModuleService from "../../events/service"
import {
  mapReservationsForEventItem,
  type MappedEventItemDate,
} from "../mappings/course-product-reservation"
import { sameDate } from "./deep-equal"

function eventItemDateEquals(
  existing: Record<string, unknown>,
  patch: MappedEventItemDate
): boolean {
  return (
    sameDate(existing.start_at as string | Date | null, patch.start_at) &&
    sameDate(existing.end_at as string | Date | null, patch.end_at) &&
    existing.title === patch.title &&
    Number(existing.sequence ?? null) === patch.sequence &&
    existing.session_type === patch.session_type &&
    existing.location_name === patch.location_name &&
    existing.room_name === patch.room_name &&
    existing.address === patch.address &&
    existing.instructor_name === patch.instructor_name &&
    existing.instructor_salesforce_id === patch.instructor_salesforce_id &&
    Boolean(existing.is_substitute) === patch.is_substitute
  )
}

/** Upsert `event_item_date` rows from Salesforce `Reservations__r` on a child product. */
export async function syncEventItemDatesForChild(
  events: InstanceType<typeof EventsModuleService>,
  eventItemId: string,
  child: Record<string, unknown>
): Promise<void> {
  const desired = mapReservationsForEventItem(child)
  const desiredIds = new Set(desired.map((row) => row.salesforce_id))

  const existing = await events.listEventItemDates(
    { event_item_id: eventItemId },
    { take: 500, order: { sequence: "ASC" } }
  )

  for (const row of existing) {
    if (!desiredIds.has(row.salesforce_id)) {
      await events.deleteEventItemDates(row.id)
    }
  }

  const existingBySfId = new Map(existing.map((row) => [row.salesforce_id, row]))

  // A reservation may already exist under another event item (e.g. moved in Salesforce);
  // salesforce_id is globally unique, so look those up and re-link instead of creating.
  const missingIds = [...desiredIds].filter((id) => !existingBySfId.has(id))
  if (missingIds.length > 0) {
    const elsewhere = await events.listEventItemDates(
      { salesforce_id: missingIds },
      { take: missingIds.length }
    )
    for (const row of elsewhere) {
      existingBySfId.set(row.salesforce_id, row)
    }
  }

  const seen = new Set<string>()
  for (const patch of desired) {
    // Guard against duplicate reservation ids within one payload
    if (seen.has(patch.salesforce_id)) continue
    seen.add(patch.salesforce_id)

    const current = existingBySfId.get(patch.salesforce_id)
    if (current) {
      if (
        current.event_item_id === eventItemId &&
        eventItemDateEquals(current as unknown as Record<string, unknown>, patch)
      ) {
        continue
      }
      await events.updateEventItemDates({
        id: current.id,
        event_item_id: eventItemId,
        ...patch,
      })
      continue
    }

    await events.createEventItemDates({
      event_item_id: eventItemId,
      ...patch,
    })
  }
}