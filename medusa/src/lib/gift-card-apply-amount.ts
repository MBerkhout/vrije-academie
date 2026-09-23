import { centsToMedusaMajor, medusaMajorToCents } from "./medusa-price-to-cents"

/** Gift card DB balance/reserves are cents; cart totals and credit lines are major EUR. */
export function computeGiftCardApplication(input: {
  balanceCents: number
  reservedCents: number
  cartTotalMajor: number
}): {
  appliedMajor: number
  appliedCents: number
  remainingCents: number
} {
  const availableCents = Math.max(0, Math.round(input.balanceCents) - Math.round(input.reservedCents))
  const availableMajor = centsToMedusaMajor(availableCents)
  const cartTotalMajor = Math.max(0, input.cartTotalMajor)
  const appliedMajor = Math.min(availableMajor, cartTotalMajor)
  const appliedCents = medusaMajorToCents(appliedMajor)
  return {
    appliedMajor,
    appliedCents,
    remainingCents: Math.max(0, availableCents - appliedCents),
  }
}
