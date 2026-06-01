import { model } from "@medusajs/framework/utils"

/**
 * Editorial category (Onderwerp / genre) for product groups.
 * Linked many-to-many to Medusa `Product` via the product-categories link.
 * Mirrored read-only into Sanity by the sync subscriber.
 */
export const Category = model.define("catalog_category", {
  id: model.id().primaryKey(),
  slug: model.text(),
  label: model.text(),
  sort_order: model.number().default(0),
  image_url: model.text().nullable(),
  color: model.text().nullable(),
})
