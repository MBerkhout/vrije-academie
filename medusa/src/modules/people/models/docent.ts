import { model } from "@medusajs/framework/utils"

/**
 * Docent (instructor/teacher) linked to Product Groups.
 * Linked many-to-many to Medusa `Product` via the product-docenten link.
 * Mirrored read-only into Sanity by the sync subscriber.
 */
export const Docent = model.define("docent", {
  id: model.id().primaryKey(),
  slug: model.text(),
  name: model.text(),
  role: model.text().nullable(),
  photo_url: model.text().nullable(),
  bio: model.text().nullable(),
  subject_tags: model.json().nullable(),
})
