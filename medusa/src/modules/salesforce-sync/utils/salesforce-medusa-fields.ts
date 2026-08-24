/**
 * Medusa_* Salesforce custom fields (`Medusa_Order_Id__c`, `Medusa_Product_Id__c`, …).
 * Off unless `SALESFORCE_MEDUSA_CUSTOM_FIELDS=true` — VA Salesforce does not have these fields yet.
 * When off: omit them from payloads and skip external-id upserts (idempotency via `salesforce_sync_state`).
 */
export function usesSalesforceMedusaCustomFields(): boolean {
  const v = process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes" || v === "on"
}

export function stripMedusaCustomFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  if (usesSalesforceMedusaCustomFields()) return fields
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => !key.startsWith("Medusa_"))
  )
}
