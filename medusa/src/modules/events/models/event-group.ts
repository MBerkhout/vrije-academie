import { model } from "@medusajs/framework/utils"

import { RECORD_TYPES } from "../types"

/**
 * Product Group (event / series) extension.
 * Linked 1:1 to Medusa `Product`.
 */
export const EventGroup = model.define("event_group", {
  id: model.id().primaryKey(),
  record_type: model.enum([...RECORD_TYPES]),
  has_free_trial: model.boolean().default(false),
  /** When false, the product is omitted from `GET /store/events` and `GET /store/agenda`. Default true. */
  show_in_plp: model.boolean().default(true),
})
