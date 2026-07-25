import { describe, expect, it } from 'vitest'
import { resolvePageType } from '@/lib/analytics/page-types'

describe('resolvePageType', () => {
  it('maps known routes', () => {
    expect(resolvePageType('/')).toBe('home')
    expect(resolvePageType('/winkelwagen')).toBe('mand')
    expect(resolvePageType('/checkout/betaling')).toBe('inschrijven')
    expect(resolvePageType('/bedankt')).toBe('bevestiging')
    expect(resolvePageType('/mijn-account')).toBe('account')
    expect(resolvePageType('/cadeaubon')).toBe('cadeaubon')
    expect(resolvePageType('/va-thuis/chagall')).toBe('vathuis')
    expect(resolvePageType('/ons-aanbod')).toBe('aanbod_overzicht')
    expect(resolvePageType('/ons-aanbod/kunst')).toBe('aanbod_overzicht')
    expect(resolvePageType('/ons-aanbod/colleges-intro')).toBe('aanbod_overzicht')
    expect(resolvePageType('/agenda')).toBe('aanbod_overzicht')
  })
})
