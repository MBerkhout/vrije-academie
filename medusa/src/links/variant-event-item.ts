import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import EventsModule from "../modules/events"

/**
 * Product (`ProductVariant`) ↔ `EventItem` (delivery, available quantity) — one-to-one.
 */
const variantEventItemLink = defineLink(
  ProductModule.linkable.productVariant,
  EventsModule.linkable.eventItem
)

export default variantEventItemLink
