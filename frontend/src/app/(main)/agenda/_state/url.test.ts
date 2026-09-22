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
})
