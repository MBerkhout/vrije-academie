/** Medusa order/line amounts are in smallest currency unit (cents). SF uses major EUR. */
export function centsToMajorEur(cents: number): number {
  return Math.round(cents) / 100
}

export function majorEurToCents(major: number): number {
  return Math.round(major * 100)
}
