import { model } from "@medusajs/framework/utils"

/**
 * Inbound Salesforce webhook queue — one row per Salesforce id in a webhook payload.
 */
export const SalesforceWebhookEvent = model
  .define("salesforce_webhook_event", {
    id: model.id().primaryKey(),
    object_type: model.text(),
    method: model.text(),
    salesforce_id: model.text(),
    entity_type: model.text().nullable(),
    medusa_id: model.text().nullable(),
    status: model.text().default("pending"),
    attempts: model.number().default(0),
    error: model.text().nullable(),
    received_at: model.dateTime(),
    processed_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["status"],
      where: "deleted_at IS NULL",
    },
    {
      on: ["object_type", "salesforce_id"],
      where: "deleted_at IS NULL",
    },
    {
      on: ["created_at"],
      where: "deleted_at IS NULL",
    },
  ])
