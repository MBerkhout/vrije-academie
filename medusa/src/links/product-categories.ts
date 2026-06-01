import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import CatalogModule from "../modules/catalog"

/**
 * Product Group (`Product`) ↔ `Category` — many-to-many (shared onderwerpen).
 */
const productCategoriesLink = defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: CatalogModule.linkable.catalogCategory, isList: true }
)

export default productCategoriesLink
