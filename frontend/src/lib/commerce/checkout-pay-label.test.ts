import { describe, expect, it } from 'vitest'
import { checkoutPayButtonLabel } from './checkout-pay-label'

describe('checkoutPayButtonLabel', () => {
  it('shows Betaal plus the amount, without Betalen or a dash', () => {
    const label = checkoutPayButtonLabel({ busy: false, total: 4950 })
    expect(label.startsWith('Betaal €')).toBe(true)
    expect(label).not.toMatch(/betalen/i)
    expect(label).not.toContain('—')
    expect(label).toContain('49,50')
  })

  it('uses Bestelling plaatsen when the total is zero', () => {
    expect(checkoutPayButtonLabel({ busy: false, total: 0 })).toBe('Bestelling plaatsen')
    expect(checkoutPayButtonLabel({ busy: true, total: 0 })).toBe('Bestelling plaatsen…')
  })

  it('shows the redirect label while a paid checkout is leaving the page', () => {
    expect(checkoutPayButtonLabel({ busy: true, total: 4950 })).toBe('Je wordt doorgestuurd…')
  })
})
