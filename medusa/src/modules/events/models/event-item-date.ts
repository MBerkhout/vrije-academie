import { model } from "@medusajs/framework/utils"

/**
 * One row in a collegereeks schedule (Salesforce `B25__Reservation__c` via `Reservations__r`).
 * Linked to parent `EventItem` by `event_item_id`.
 */
export const EventItemDate = model.define("event_item_date", {
  id: model.id().primaryKey(),
  event_item_id: model.text(),
  salesforce_id: model.text(),
  start_at: model.dateTime().nullable(),
  end_at: model.dateTime().nullable(),
  title: model.text().nullable(),
  sequence: model.number().nullable(),
  session_type: model.text().nullable(),
  location_name: model.text().nullable(),
  room_name: model.text().nullable(),
  address: model.text().nullable(),
  instructor_name: model.text().nullable(),
  instructor_salesforce_id: model.text().nullable(),
  is_substitute: model.boolean().default(false),
})