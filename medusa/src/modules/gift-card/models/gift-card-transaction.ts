import { model } from "@medusajs/framework/utils"

export const GiftCardTransaction = model.define("GiftCardTransaction", {
  id: model.id({ prefix: "gctx" }).primaryKey(),
  gift_card_id: model.text(),
  cart_id: model.text().nullable(),
  type: model.text(),
  amount: model.number(),
  order_id: model.text().nullable(),
  note: model.text().nullable(),
})
