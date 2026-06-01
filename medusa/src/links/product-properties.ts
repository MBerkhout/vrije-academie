import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import EventsModule from "../modules/events"

/**
 * Product Group (`Product`) ↔ many `Property` rows (filter facets).
 */
const productPropertiesLink = defineLink(ProductModule.linkable.product, {
  linkable: EventsModule.linkable.property,
  isList: true,
})

export default productPropertiesLink
