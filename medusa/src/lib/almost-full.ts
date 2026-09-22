/** When capacity is unknown, match legacy agenda rule (≤ 3 spots remaining). */
export const ALMOST_FULL_FALLBACK_REMAINING_THRESHOLD = 3

/** 30% of capacity, rounded up — "Bijna vol" when remaining seats are at or below this. */
export function almostFullRemainingThreshold(capacity: number): number | null {
  if (!Number.isFinite(capacity) || capacity <= 0) return null
  return Math.ceil(capacity * 0.3)
}

export function isAlmostFullAvailability(input: {
  available_quantity: number
  capacity?: number | null
}): boolean {
  const remaining = Number(input.available_quantity ?? 0)
  if (remaining <= 0) return false

  const threshold = almostFullRemainingThreshold(Number(input.capacity ?? 0))
  if (threshold === null) {
    return remaining <= ALMOST_FULL_FALLBACK_REMAINING_THRESHOLD
  }
  return remaining <= threshold
}
