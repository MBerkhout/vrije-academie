import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import EventsModule from "../modules/events"

/**
 * Product Group (`Product`) ↔ `EventGroup` (record type, etc.) — one-to-one.
 */
const productEventGroupLink = defineLink(
  ProductModule.linkable.product,
  EventsModule.linkable.eventGroup
)

export default productEventGroupLink
