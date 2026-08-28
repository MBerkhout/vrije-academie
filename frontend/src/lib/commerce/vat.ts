import { formatVatRatePercent } from '@/lib/address/eu-countries'

export function vatIncludedLabel(rate: number): string {
  return `waarvan BTW (${formatVatRatePercent(rate)}%)`
}

function taxLinesFromItem(item: unknown): { rate?: number | null }[] {
  const taxLines = (item as { tax_lines?: { rate?: number | null }[] | null }).tax_lines
  return Array.isArray(taxLines) ? taxLines : []
}

/** Unique positive VAT rates from cart line tax_lines (Medusa product-type rules). */
export function uniqueTaxRatesFromItems(items: unknown[]): number[] {
  const rates = new Set<number>()
  for (const item of items) {
    for (const line of taxLinesFromItem(item)) {
      const rate = line?.rate
      if (typeof rate === 'number' && rate > 0) rates.add(rate)
    }
  }
  return [...rates].sort((a, b) => a - b)
}

function singleTaxRateFromLineItems(items: unknown[]): number | undefined {
  const rates = uniqueTaxRatesFromItems(items)
  return rates.length === 1 ? rates[0] : undefined
}

/** VAT % from Medusa tax lines only — no country-standard fallback (NL has 9% product overrides). */
export function vatPercentFromCartLike(raw: {
  items?: unknown[]
  tax_rate?: number | null
}): number | undefined {
  if (typeof raw.tax_rate === 'number' && raw.tax_rate > 0) return raw.tax_rate
  return singleTaxRateFromLineItems(Array.isArray(raw.items) ? raw.items : [])
}

/** Label for included VAT row; omit % when rates differ or are not yet calculated. */
export function vatIncludedLabelForCart(raw: {
  items?: unknown[]
  tax_rate?: number | null
}): string {
  const rates = uniqueTaxRatesFromItems(Array.isArray(raw.items) ? raw.items : [])
  if (rates.length === 1) return vatIncludedLabel(rates[0])
  const fallback = vatPercentFromCartLike(raw)
  if (fallback != null) return vatIncludedLabel(fallback)
  return 'waarvan BTW'
}

/** Consumer-facing merchandise total (gross, before discount/credit). */
export function grossMerchandiseTotalCents(cart: {
  total?: number
  discount_total?: number
  credit_line_total?: number
}): number {
  return Math.max(
    0,
    (cart.total ?? 0) + (cart.discount_total ?? 0) + (cart.credit_line_total ?? 0)
  )
}
