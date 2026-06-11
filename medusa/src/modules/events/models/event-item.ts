import { model } from "@medusajs/framework/utils"

import { DELIVERY_TYPES } from "../types"

/**
 * Product (concrete event instance: date / location).
 * Linked 1:1 to Medusa `ProductVariant`.
 *
 * `start_at` / `end_at` — session datetime (timestamptz, nullable).
 * `city`                 — city display label for offline sessions (nullable).
 * `city_slug`            — canonical catalog_city slug (nullable).
 * `location_name`        — venue / location label from Salesforce `Product_Location_Name__c` (nullable).
 * `day_part`             — ochtend / middag / avond, derived in the API from start_at hour.
 */
export const EventItem = model.define("event_item", {
  id: model.id().primaryKey(),
  delivery_type: model.enum([...DELIVERY_TYPES]),
  available_quantity: model.number().default(0),
  start_at: model.dateTime().nullable(),
  end_at: model.dateTime().nullable(),
  city: model.text().nullable(),
  city_slug: model.text().nullable(),
  location_name: model.text().nullable(),
  registration_deadline_at: model.dateTime().nullable(),
  is_free_trial: model.boolean().default(false),
  /** Display name from Salesforce child `Account_Teacher__c` / `Main_Teacher_Name__c` (per variant). */
  instructor_name: model.text().nullable(),
  /** Salesforce Account id for the teacher (`Account_Teacher__c` on `vaProduct__c`). */
  instructor_salesforce_id: model.text().nullable(),
})
