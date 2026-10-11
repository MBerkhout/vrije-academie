import { describe, expect, it } from 'vitest'
import { parseFilterState, serializeFilterState } from './url'

describe('agenda filter URL', () => {
  it('drops leftover VAthuis delivery params', () => {
    const state = parseFilterState(new URLSearchParams('delivery_type=online&delivery_type=pre_recorded'))
    expect(state.deliveryTypes).toEqual(['online'])
    expect(serializeFilterState(state).getAll('delivery_type')).toEqual(['online'])
  })

  it('does not serialize a VAthuis delivery type', () => {
    const params = serializeFilterState({
      deliveryTypes: ['offline', 'pre_recorded'],
    })
    expect(params.getAll('delivery_type')).toEqual(['offline'])
  })

  it('round-trips product_type (Soort activiteit)', () => {
    const state = parseFilterState(
      new URLSearchParams('product_type=lezing&product_type=collegereeks'),
    )
    expect(state.productTypes).toEqual(['lezing', 'collegereeks'])
    expect(serializeFilterState(state).getAll('product_type')).toEqual(['lezing', 'collegereeks'])
  })
})
