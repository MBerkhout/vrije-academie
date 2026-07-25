/** VA Thuis viewing access duration after purchase. */
export const VATHUIS_ACCESS_MONTHS = 3

/**
 * Add calendar months with day clamping (e.g. Jan 31 + 1 month → Feb 28/29).
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const day = result.getDate()
  result.setMonth(result.getMonth() + months)
  if (result.getDate() < day) {
    result.setDate(0)
  }
  return result
}

export function vathuisAccessExpiresAt(grantedAt: Date): Date {
  return addCalendarMonths(grantedAt, VATHUIS_ACCESS_MONTHS)
}

export function toIsoString(date: Date): string {
  return date.toISOString()
}

export function parseIsoDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

export function isAccessActive(expiresAt: string | Date | null | undefined, now = new Date()): boolean {
  const exp = parseIsoDate(expiresAt)
  if (!exp) return false
  return exp.getTime() > now.getTime()
}
