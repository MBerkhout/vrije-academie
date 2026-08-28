import { formatVatRatePercent, getEuVatRate } from '@/lib/address/eu-countries'

export function vatIncludedLabel(rate: number): string {
  return `waarvan BTW (${formatVatRatePercent(rate)}%)`
}

function taxRateFromLineItems(items: unknown[]): number | undefined {
  for (const item of items) {
    const taxLines = (item as { tax_lines?: { rate?: number | null }[] | null }).tax_lines
    if (!Array.isArray(taxLines)) continue
    for (const line of taxLines) {
      const rate = line?.rate
      if (typeof rate === 'number' && rate > 0) return rate
    }
  }
  return undefined
}

export function vatPercentFromCartLike(raw: {
  items?: unknown[]
  shipping_address?: { country_code?: string | null } | null
  billing_address?: { country_code?: string | null } | null
  tax_rate?: number | null
}): number {
  if (typeof raw.tax_rate === 'number' && raw.tax_rate > 0) return raw.tax_rate
  const fromLines = taxRateFromLineItems(Array.isArray(raw.items) ? raw.items : [])
  if (fromLines != null) return fromLines
  const country =
    raw.shipping_address?.country_code ?? raw.billing_address?.country_code ?? 'nl'
  return getEuVatRate(country)
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
