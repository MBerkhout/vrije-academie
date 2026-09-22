import { describe, expect, it } from 'vitest'
import { pdpActivityTypeBadge } from './pdp-activity-badge'
import { PLP_BASE_PATH, VATHUIS_BASE_PATH } from './routes'

describe('pdpActivityTypeBadge', () => {
  it('uses the Salesforce product type for Soort activiteit landings', () => {
    expect(pdpActivityTypeBadge({ productType: 'Wandeling', recordType: 'lezing' })).toEqual({
      label: 'Wandeling',
      href: `${PLP_BASE_PATH}/wandeling`,
    })
    expect(pdpActivityTypeBadge({ productType: 'Reis', recordType: 'lezing' })).toEqual({
      label: 'Reis',
      href: `${PLP_BASE_PATH}/reis`,
    })
  })

  it('keeps EventGroup record type when product type has no landing', () => {
    expect(pdpActivityTypeBadge({ productType: 'Lezing', recordType: 'lezing' })).toEqual({
      label: 'lezing',
      href: `${PLP_BASE_PATH}?record_type=lezing`,
    })
    expect(pdpActivityTypeBadge({ productType: 'Collegereeks', recordType: 'collegereeks' })).toEqual({
      label: 'collegereeks',
      href: `${PLP_BASE_PATH}?record_type=collegereeks`,
    })
  })

  it('routes VA Thuis record types to /va-thuis', () => {
    expect(pdpActivityTypeBadge({ productType: 'Lezingen_thuis', recordType: 'vathuis' })).toEqual({
      label: 'vathuis',
      href: VATHUIS_BASE_PATH,
    })
  })

  it('returns null when neither field is usable', () => {
    expect(pdpActivityTypeBadge({})).toBeNull()
    expect(pdpActivityTypeBadge({ productType: '  ', recordType: '' })).toBeNull()
  })
})
