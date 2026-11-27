import { model } from "@medusajs/framework/utils"

/** Daily GA4 stats per product (`product_handle` = GA4 `item_id`). Unique on (handle, date). */
export const ProductAnalyticsDaily = model
  .define("product_analytics_daily", {
    id: model.id().primaryKey(),
    product_handle: model.text(),
    /** ISO date, YYYY-MM-DD */
    date: model.text(),
    views: model.number().default(0),
    unique_users: model.number().default(0),
    add_to_cart: model.number().default(0),
    list_clicks: model.number().default(0),
    avg_list_position: model.float().nullable(),
  })
  .indexes([
    { on: ["product_handle", "date"], unique: true },
    { on: ["date"] },
  ])
