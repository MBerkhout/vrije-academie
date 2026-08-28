import { describe, expect, it } from 'vitest'
import { grossMerchandiseTotalCents, vatIncludedLabel, vatPercentFromCartLike } from '@/lib/commerce/vat'

describe('vat helpers', () => {
  it('builds waarvan BTW label with dynamic rate', () => {
    expect(vatIncludedLabel(21)).toBe('waarvan BTW (21%)')
    expect(vatIncludedLabel(25.5)).toBe('waarvan BTW (25,5%)')
  })

  it('falls back to EU country VAT rate', () => {
    expect(
      vatPercentFromCartLike({
        items: [],
        shipping_address: { country_code: 'de' },
      })
    ).toBe(19)
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
