import { describe, expect, it } from 'vitest'
import {
  deliveryTypeLabel,
  excludeVathuisDeliveryTypes,
  hasVathuisDeliveryFilter,
  listingDeliveryOptions,
} from '../plp-delivery-types'

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

describe('listingDeliveryOptions', () => {
  it('includes VAthuis by default', () => {
    expect(listingDeliveryOptions().map((opt) => opt.value)).toEqual([
      'online',
      'offline',
      'pre_recorded',
    ])
  })

  it('omits VAthuis when asked', () => {
    expect(listingDeliveryOptions(false).map((opt) => opt.value)).toEqual(['online', 'offline'])
  })
})

describe('excludeVathuisDeliveryTypes', () => {
  it('drops pre_recorded and keeps live types', () => {
    expect(excludeVathuisDeliveryTypes(['online', 'pre_recorded', 'offline'])).toEqual([
      'online',
      'offline',
    ])
  })
})
