/**
 * Medusa v2 stores variant prices in major currency units (e.g. 19.5 EUR).
 * The storefront and Sanity mirror expect integer cents (e.g. 1950).
 */

type PriceRow = { amount?: number | string | null; currency_code?: string | null }

export function medusaMajorToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

export function priceRowsToCents(prices: PriceRow[] | null | undefined): number[] {
  return (prices ?? [])
    .map((p) => medusaMajorToCents(Number(p.amount ?? 0)))
    .filter((n) => n > 0)
}

export function minPriceCentsFromVariants(
  variants: { prices?: PriceRow[] | null }[] | null | undefined
): number | null {
  const cents = (variants ?? []).flatMap((v) => priceRowsToCents(v.prices))
  return cents.length ? Math.min(...cents) : null
}

export function normalizeVariantPricesForStorefront(
  prices: PriceRow[] | null | undefined
): { amount: number; currency_code: string }[] {
  return (prices ?? []).map((p) => ({
    amount: medusaMajorToCents(Number(p.amount ?? 0)),
    currency_code: String(p.currency_code ?? "eur").toLowerCase(),
  }))
}
