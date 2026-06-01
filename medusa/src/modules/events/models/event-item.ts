import { model } from "@medusajs/framework/utils"

import { DELIVERY_TYPES } from "../types"

/**
 * Product (concrete event instance: date / location).
 * Linked 1:1 to Medusa `ProductVariant`.
 *
 * `start_at` / `end_at` — session datetime (timestamptz, nullable).
 * `city`                 — city display label for offline sessions (nullable).
 * `city_slug`            — canonical catalog_city slug (nullable).
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
  registration_deadline_at: model.dateTime().nullable(),
  is_free_trial: model.boolean().default(false),
})
