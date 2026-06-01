import { model } from "@medusajs/framework/utils"

export const GiftCard = model
  .define("GiftCard", {
    id: model.id({ prefix: "gc" }).primaryKey(),
    code: model.text(),
    initial_value: model.number(),
    balance: model.number(),
    currency_code: model.text(),
    status: model.text().default("active"),
    recipient_name: model.text(),
    recipient_email: model.text(),
    sender_name: model.text().nullable(),
    message: model.text().nullable(),
    purchased_by_order_id: model.text().nullable(),
    source_line_item_id: model.text().nullable(),
    /** ISO 8601 expiry instant */
    expires_at: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_gift_card_status",
      on: ["status"],
      unique: false,
    },
    {
      name: "IDX_gift_card_recipient_email",
      on: ["recipient_email"],
      unique: false,
    },
    {
      name: "IDX_gift_card_order_line",
      on: ["purchased_by_order_id", "source_line_item_id"],
      unique: false,
    },
  ])
