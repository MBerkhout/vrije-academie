import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import PeopleModule from "../modules/people"

/**
 * Product Group (`Product`) ↔ `Docent` — one product has many docenten.
 * Pivot table allows many-to-many at the data level.
 */
const productDocentenLink = defineLink(
  ProductModule.linkable.product,
  { linkable: PeopleModule.linkable.docent, isList: true }
)

export default productDocentenLink
