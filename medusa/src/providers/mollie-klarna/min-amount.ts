export const DEFAULT_KLARNA_MIN_AMOUNT = 100

/** Parses KLARNA_MIN_AMOUNT (euros). Invalid/negative -> default; 0 disables the limit. */
export function parseKlarnaMinAmount(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_KLARNA_MIN_AMOUNT
  const n = Number(raw.replace(",", "."))
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_KLARNA_MIN_AMOUNT
}

export function isBelowKlarnaMinimum(
  amount: number | string | { toString(): string },
  minAmount: number | undefined
): boolean {
  if (!minAmount || minAmount <= 0) return false
  return parseFloat(amount.toString()) < minAmount
}
