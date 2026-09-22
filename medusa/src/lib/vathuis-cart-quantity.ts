export function vathuisAddToCartPlan(input: {
  isVathuis: boolean
  alreadyInCart: boolean
  requestedQuantity?: number
}): { action: "skip" } | { action: "add"; quantity: number } {
  if (!input.isVathuis) {
    return { action: "add", quantity: input.requestedQuantity ?? 1 }
  }
  if (input.alreadyInCart) return { action: "skip" }
  return { action: "add", quantity: 1 }
}
