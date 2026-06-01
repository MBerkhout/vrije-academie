import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import EventsModule from "../modules/events"

/**
 * Product (`ProductVariant`) ↔ many `Property` rows (filter facets).
 */
const variantPropertiesLink = defineLink(ProductModule.linkable.productVariant, {
  linkable: EventsModule.linkable.property,
  isList: true,
})

export default variantPropertiesLink
