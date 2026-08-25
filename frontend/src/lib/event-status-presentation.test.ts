import { describe, expect, it } from 'vitest'
import type { EventCard } from '@/lib/commerce/types'
import {
  eventIsFullySoldOut,
  minPositiveBookableQuantity,
  plpListingStockPresentation,
} from './event-status-presentation'

const futureStart = '2099-06-01T10:00:00.000Z'

function makeEvent(
  quantities: number[],
  overrides: Partial<EventCard> = {},
): Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id' | 'min_available_quantity'> {
  const variants = quantities.map((available_quantity, index) => ({
    id: `v${index + 1}`,
    title: `Session ${index + 1}`,
    event_item: {
      id: `ei${index + 1}`,
      delivery_type: 'offline',
      available_quantity,
      start_at: futureStart,
      is_free_trial: false,
    },
  }))

  return {
    variants,
    min_available_quantity: quantities.length ? Math.min(...quantities) : null,
    ...overrides,
  }
}

describe('eventIsFullySoldOut', () => {
  it('is false for VA Thuis bundle-only products even when quantity is zero', () => {
    expect(
      eventIsFullySoldOut(
        makeEvent([0], { purchase_mode: 'bundle_only', record_type: 'vathuis' }),
      ),
    ).toBe(false)
  })

  it('is false when only one of multiple sessions is sold out', () => {
    expect(eventIsFullySoldOut(makeEvent([0, 12]))).toBe(false)
  })

  it('is true when every bookable session is sold out', () => {
    expect(eventIsFullySoldOut(makeEvent([0, 0]))).toBe(true)
  })

  it('is false when there are no bookable variants and min_available_quantity is unset', () => {
    expect(eventIsFullySoldOut({ variants: [] })).toBe(false)
  })

  it('is true when variants are stripped but min_available_quantity is zero', () => {
    expect(eventIsFullySoldOut({ variants: [], min_available_quantity: 0 })).toBe(true)
  })
})

describe('minPositiveBookableQuantity', () => {
  it('returns the lowest positive count when some sessions are sold out', () => {
    expect(minPositiveBookableQuantity(makeEvent([0, 4, 9]))).toBe(4)
  })

  it('returns null when every session is sold out', () => {
    expect(minPositiveBookableQuantity(makeEvent([0, 0]))).toBeNull()
  })
})

describe('plpListingStockPresentation', () => {
  it('never marks VA Thuis products as sold out', () => {
    const result = plpListingStockPresentation(
      makeEvent([0, 0], { purchase_mode: 'bundle_only', record_type: 'vathuis' }),
      5,
    )
    expect(result.soldOut).toBe(false)
    expect(result.lowStock).toBeNull()
  })

  it('does not mark a product sold out when only one date is volgeboekt', () => {
    const result = plpListingStockPresentation(makeEvent([0, 8]), 5)
    expect(result.soldOut).toBe(false)
    expect(result.lowStock).toBeNull()
  })

  it('marks a product sold out when every date is volgeboekt', () => {
    const result = plpListingStockPresentation(makeEvent([0, 0]), 5)
    expect(result.soldOut).toBe(true)
    expect(result.lowStock).toBeNull()
  })

  it('marks a product sold out from min_available_quantity when variants are stripped', () => {
    const result = plpListingStockPresentation(
      { variants: [], min_available_quantity: 0 },
      5,
    )
    expect(result.soldOut).toBe(true)
    expect(result.lowStock).toBeNull()
  })
})
