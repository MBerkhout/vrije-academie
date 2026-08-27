/** YYYYMMDD integer ↔ local calendar date for promotion admin date pickers. */
export function yyyymmddToLocalDate(value: unknown): Date | null {
  const parsed =
    typeof value === "string" || typeof value === "number"
      ? Number.parseInt(String(value), 10)
      : NaN

  if (!Number.isFinite(parsed) || parsed < 10000101) {
    return null
  }

  const raw = String(parsed)
  const year = Number.parseInt(raw.slice(0, 4), 10)
  const month = Number.parseInt(raw.slice(4, 6), 10)
  const day = Number.parseInt(raw.slice(6, 8), 10)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

export function localDateToYyyymmdd(date: Date | null | undefined): string {
  if (!date) {
    return ""
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

export function isEventStartDateRuleAttributeId(id: string | undefined): boolean {
  return id === "event_start_from" || id === "event_start_until"
}

export function isEventStartDateRuleAttributeValue(
  value: string | undefined
): boolean {
  return (
    value === "items.metadata.event_start_from" ||
    value === "items.metadata.event_start_until"
  )
}
