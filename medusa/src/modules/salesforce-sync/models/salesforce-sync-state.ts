import { model } from "@medusajs/framework/utils"

/**
 * Per-entity sync state for Salesforce ↔ Medusa (loop guard, retries, alerts).
 */
export const SalesforceSyncState = model
  .define("salesforce_sync_state", {
    id: model.id().primaryKey(),
    entity_type: model.text(),
    medusa_id: model.text(),
    salesforce_id: model.text().nullable(),
    /** Person Account Id (001…) when entity_type is customer. */
    salesforce_account_id: model.text().nullable(),
    last_pushed_at: model.dateTime().nullable(),
    last_pulled_at: model.dateTime().nullable(),
    last_status: model.text().nullable(),
    last_error: model.text().nullable(),
    failure_count: model.number().default(0),
    next_retry_at: model.dateTime().nullable(),
    severity: model.text().nullable(),
    last_alert_at_failure_bucket: model.number().nullable(),
    incoming_lock_until: model.dateTime().nullable(),
    mapping_version: model.text().nullable(),
  })
  .indexes([
    {
      on: ["entity_type", "medusa_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])
