/** Convert minor currency units (cents) to EUR major units for dataLayer. */
export function centsToEur(cents: number | null | undefined): number {
  if (cents == null || Number.isNaN(cents)) return 0
  return Math.round(cents) / 100
}
