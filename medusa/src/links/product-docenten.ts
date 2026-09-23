import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import PeopleModule from "../modules/people"

/**
 * Product Group (`Product`) ↔ `Docent` — many-to-many.
 * A product group has one highlighted docent; that same docent is highlighted on many groups.
 */
const productDocentenLink = defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: PeopleModule.linkable.docent, isList: true }
)

export default productDocentenLink
