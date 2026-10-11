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
    expect(pdpActivityTypeBadge({ productType: 'Rondleiding', recordType: 'lezing' })).toEqual({
      label: 'Rondleiding',
      href: `${PLP_BASE_PATH}/rondleiding`,
    })
  })

  it('links Lezing and Collegereeks to product-type landings', () => {
    expect(pdpActivityTypeBadge({ productType: 'Lezing', recordType: 'lezing' })).toEqual({
      label: 'Lezing',
      href: `${PLP_BASE_PATH}/lezing`,
    })
    expect(pdpActivityTypeBadge({ productType: 'Collegereeks', recordType: 'collegereeks' })).toEqual({
      label: 'Collegereeks',
      href: `${PLP_BASE_PATH}/collegereeks`,
    })
  })

  it('keeps EventGroup record type when product type has no landing', () => {
    expect(pdpActivityTypeBadge({ productType: 'Excursie', recordType: 'excursie' })).toEqual({
      label: 'excursie',
      href: `${PLP_BASE_PATH}?record_type=excursie`,
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
