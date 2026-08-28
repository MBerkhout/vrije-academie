import { describe, expect, it } from 'vitest'
import {
  grossMerchandiseTotalCents,
  vatIncludedLabel,
  vatIncludedLabelForCart,
  vatPercentFromCartLike,
} from '@/lib/commerce/vat'

describe('vat helpers', () => {
  it('builds waarvan BTW label with dynamic rate', () => {
    expect(vatIncludedLabel(21)).toBe('waarvan BTW (21%)')
    expect(vatIncludedLabel(25.5)).toBe('waarvan BTW (25,5%)')
  })

  it('uses Medusa tax lines only (no country fallback)', () => {
    expect(vatPercentFromCartLike({ items: [] })).toBeUndefined()
    expect(
      vatPercentFromCartLike({
        items: [{ tax_lines: [{ rate: 9 }] }],
      })
    ).toBe(9)
  })

  it('omits % when cart has mixed VAT rates', () => {
    expect(
      vatIncludedLabelForCart({
        items: [
          { tax_lines: [{ rate: 9 }] },
          { tax_lines: [{ rate: 21 }] },
        ],
      })
    ).toBe('waarvan BTW')
  })

  it('shows single rate from tax lines', () => {
    expect(
      vatIncludedLabelForCart({
        items: [{ tax_lines: [{ rate: 9 }] }],
      })
    ).toBe('waarvan BTW (9%)')
  })

  it('computes gross merchandise total from payable total', () => {
    expect(
      grossMerchandiseTotalCents({
        total: 8000,
        discount_total: 1000,
        credit_line_total: 1000,
      })
    ).toBe(10000)
  })
})
