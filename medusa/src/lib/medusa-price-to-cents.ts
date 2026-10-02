/**
 * Medusa v2 stores variant prices in major currency units (e.g. 19.5 EUR).
 * The storefront and Sanity mirror expect integer cents (e.g. 1950).
 */

type PriceRow = { amount?: number | string | null; currency_code?: string | null }

export function medusaMajorToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

/** Cart/order `unit_price` is major EUR (e.g. 50 = €50). */
export function centsToMedusaMajor(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) return 0
  return Math.round(cents) / 100
}

export function priceRowsToCents(prices: PriceRow[] | null | undefined): number[] {
  return (prices ?? [])
    .map((p) => medusaMajorToCents(Number(p.amount ?? 0)))
    .filter((n) => n > 0)
}

type PriceableVariant = {
  prices?: PriceRow[] | null
  sku?: string | null
  event_item?: unknown
}

/** Salesforce import placeholder variant (`sf-group-<id>`), created when a group has no sessions yet. */
export function isSalesforceGroupPlaceholderVariant(variant: { sku?: string | null }): boolean {
  return typeof variant.sku === "string" && variant.sku.startsWith("sf-group-")
}

/**
 * Variants that define the "Vanaf" price, in order of preference:
 * 1. variants with an `event_item` (real sessions);
 * 2. otherwise variants that are not `sf-group-` placeholders (e.g. VA Thuis bundles);
 * 3. otherwise all variants (placeholder-only products keep the group price).
 */
export function variantsForPriceFrom<T extends PriceableVariant>(
  variants: T[] | null | undefined
): T[] {
  const list = variants ?? []
  const sessions = list.filter((v) => !!v.event_item)
  if (sessions.length > 0) return sessions
  const nonPlaceholders = list.filter((v) => !isSalesforceGroupPlaceholderVariant(v))
  return nonPlaceholders.length > 0 ? nonPlaceholders : list
}

export function minPriceCentsFromVariants(
  variants: PriceableVariant[] | null | undefined
): number | null {
  const cents = variantsForPriceFrom(variants).flatMap((v) => priceRowsToCents(v.prices))
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
