import { model } from "@medusajs/framework/utils"

export const CustomerOtpChallenge = model
  .define("CustomerOtpChallenge", {
    id: model.id({ prefix: "cotp" }).primaryKey(),
    email: model.text(),
    code_hash: model.text(),
    purpose: model.text(),
    expires_at: model.dateTime(),
    attempts: model.number().default(0),
  })
  .indexes([
    {
      name: "IDX_customer_otp_challenge_email_purpose",
      on: ["email", "purpose"],
      unique: false,
    },
    {
      name: "IDX_customer_otp_challenge_expires_at",
      on: ["expires_at"],
      unique: false,
    },
  ])
