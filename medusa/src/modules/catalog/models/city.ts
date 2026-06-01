import { model } from "@medusajs/framework/utils"

/**
 * Canonical city (plaats) for offline event sessions.
 * Linked to `event_item.city_slug`. Mirrored read-only into Sanity by the sync subscriber.
 */
export const City = model.define("catalog_city", {
  id: model.id().primaryKey(),
  slug: model.text(),
  label: model.text(),
  sort_order: model.number().default(0),
})
