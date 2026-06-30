/** Matches Medusa `CUSTOMER_METADATA_KEYS.birthdate` / Salesforce Contact `Birthdate`. */
export const SF_BIRTHDATE_METADATA_KEY = 'sf_birthdate'

/** Read ISO date (YYYY-MM-DD) from customer metadata for `<input type="date">`. */
export function readCustomerBirthdate(
  metadata?: Record<string, unknown> | null
): string {
  const raw = metadata?.[SF_BIRTHDATE_METADATA_KEY]
  if (typeof raw !== 'string') return ''
  return normalizeBirthdateInput(raw)
}

/** Normalize to ISO date for Medusa metadata and Salesforce. */
export function normalizeBirthdateInput(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const dmy = v.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  return v
}
