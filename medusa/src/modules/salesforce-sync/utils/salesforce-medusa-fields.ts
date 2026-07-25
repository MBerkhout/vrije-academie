/** When false, omit Medusa_* custom fields and skip external-id upserts (create/update via sync state only). */
export function usesSalesforceMedusaCustomFields(): boolean {
  const v = process.env.SALESFORCE_MEDUSA_CUSTOM_FIELDS?.trim().toLowerCase()
  if (v === "0" || v === "false" || v === "no" || v === "off") return false
  return true
}

export function stripMedusaCustomFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  if (usesSalesforceMedusaCustomFields()) return fields
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => !key.startsWith("Medusa_"))
  )
}
