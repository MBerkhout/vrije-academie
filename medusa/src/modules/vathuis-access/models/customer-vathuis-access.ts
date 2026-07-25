import { model } from "@medusajs/framework/utils"

export const CustomerVathuisAccess = model
  .define("CustomerVathuisAccess", {
    id: model.id({ prefix: "vca" }).primaryKey(),
    customer_id: model.text(),
    product_id: model.text(),
    product_handle: model.text(),
    product_title: model.text().nullable(),
    variant_id: model.text(),
    order_id: model.text(),
    order_line_item_id: model.text(),
    /** ISO 8601 instant — order completion / grant time */
    granted_at: model.text(),
    /** ISO 8601 instant — granted_at + 3 calendar months */
    expires_at: model.text(),
  })
  .indexes([
    {
      name: "IDX_customer_vathuis_access_customer_product",
      on: ["customer_id", "product_id"],
      unique: true,
    },
    {
      name: "IDX_customer_vathuis_access_customer_expires",
      on: ["customer_id", "expires_at"],
      unique: false,
    },
    {
      name: "IDX_customer_vathuis_access_order_line",
      on: ["order_id", "order_line_item_id"],
      unique: false,
    },
  ])
