import { model } from "@medusajs/framework/utils"

/**
 * Dynamic key–value property for filtering (and future Salesforce import).
 * Attach to a Product Group (`Product`) and/or a Product (`ProductVariant`) via module links.
 */
export const Property = model.define("property", {
  id: model.id().primaryKey(),
  key: model.text().index("IDX_event_property_key"),
  value: model.text().index("IDX_event_property_value"),
})
