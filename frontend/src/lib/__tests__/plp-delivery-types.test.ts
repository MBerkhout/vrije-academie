import { describe, expect, it } from 'vitest'
import { deliveryTypeLabel, hasVathuisDeliveryFilter } from '../plp-delivery-types'

describe('deliveryTypeLabel', () => {
  it('labels pre_recorded as VAthuis', () => {
    expect(deliveryTypeLabel('pre_recorded')).toBe('VAthuis')
  })

  it('keeps live session labels', () => {
    expect(deliveryTypeLabel('online')).toBe('Online')
    expect(deliveryTypeLabel('offline')).toBe('Op locatie')
  })
})

describe('hasVathuisDeliveryFilter', () => {
  it('detects the pre_recorded delivery type', () => {
    expect(hasVathuisDeliveryFilter(['online', 'pre_recorded'])).toBe(true)
    expect(hasVathuisDeliveryFilter(['online'])).toBe(false)
    expect(hasVathuisDeliveryFilter([])).toBe(false)
  })
})
