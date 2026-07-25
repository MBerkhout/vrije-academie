import { model } from "@medusajs/framework/utils"

export const CustomerLegacyPassword = model
  .define("CustomerLegacyPassword", {
    id: model.id({ prefix: "clpw" }).primaryKey(),
    customer_id: model.text(),
    password_hash: model.text(),
  })
  .indexes([
    {
      name: "IDX_customer_legacy_password_customer_id",
      on: ["customer_id"],
      unique: true,
    },
  ])
