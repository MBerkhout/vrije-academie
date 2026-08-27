import { model } from "@medusajs/framework/utils"

/**
 * Canonical venue/location for offline event sessions.
 * Referenced from `event_item.catalog_location_id` (not a module link).
 */
export const Location = model.define("catalog_location", {
  id: model.id().primaryKey(),
  slug: model.text(),
  name: model.text(),
  /** Canonical catalog_city slug (nullable). */
  city_slug: model.text().nullable(),
  /** Room / zaal label from Salesforce `Product_Location_Room_Name__c` (nullable). */
  room_name: model.text().nullable(),
  /** Salesforce Account id for the venue (`Account__c` on `vaProduct__c`). */
  salesforce_account_id: model.text().nullable(),
  /** Salesforce Room id (`Product_Location_Room__c` on `vaProduct__c`). */
  salesforce_room_id: model.text().nullable(),
})
