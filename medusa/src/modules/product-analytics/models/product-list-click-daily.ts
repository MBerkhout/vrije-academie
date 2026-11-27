import { model } from "@medusajs/framework/utils"

/** Daily `select_item` clicks per product, list and position. */
export const ProductListClickDaily = model
  .define("product_list_click_daily", {
    id: model.id().primaryKey(),
    product_handle: model.text(),
    date: model.text(),
    item_list_id: model.text().default(""),
    position: model.number().default(0),
    clicks: model.number().default(0),
  })
  .indexes([
    {
      on: ["product_handle", "date", "item_list_id", "position"],
      unique: true,
    },
    { on: ["date"] },
  ])
