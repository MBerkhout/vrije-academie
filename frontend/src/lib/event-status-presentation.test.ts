import { describe, expect, it } from 'vitest'
import type { EventCard } from '@/lib/commerce/types'
import {
  bookingPanelPrimaryCtaTone,
  eventIsFullySoldOut,
  isAlmostFullAvailability,
  minPositiveBookableQuantity,
  plpListingStockPresentation,
  sessionCtaTone,
  classNameForSessionCtaTone,
  PDP_WAITLIST_CTA_CLASS,
  PDP_ALMOST_FULL_CTA_CLASS,
  sessionTableAvailabilityPresentation,
} from './event-status-presentation'

const futureStart = '2099-06-01T10:00:00.000Z'

function makeEvent(
  quantities: number[],
  overrides: Partial<EventCard> = {},
  capacities?: number[],
): Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id' | 'min_available_quantity'> {
  const variants = quantities.map((available_quantity, index) => ({
    id: `v${index + 1}`,
    title: `Session ${index + 1}`,
    event_item: {
      id: `ei${index + 1}`,
      delivery_type: 'offline',
      available_quantity,
      capacity: capacities?.[index] ?? 0,
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

describe('sessionTableAvailabilityPresentation', () => {
  it('shows Wachtlijst when a session has zero spots', () => {
    expect(sessionTableAvailabilityPresentation(0, 5).label).toBe('Wachtlijst')
  })
})

describe('isAlmostFullAvailability', () => {
  it('flips at 30% remaining for capacity 15', () => {
    expect(isAlmostFullAvailability({ available_quantity: 5, capacity: 15 })).toBe(true)
    expect(isAlmostFullAvailability({ available_quantity: 6, capacity: 15 })).toBe(false)
  })
})

describe('sessionCtaTone', () => {
  it('is sold_out at zero spots', () => {
    expect(sessionCtaTone(0, 15)).toBe('sold_out')
  })

  it('is almost_full at or below 30% of capacity', () => {
    expect(sessionCtaTone(5, 15)).toBe('almost_full')
    expect(sessionCtaTone(3, 0)).toBe('almost_full')
  })

  it('is open above the almost-full band', () => {
    expect(sessionCtaTone(6, 15)).toBe('open')
  })
})

describe('bookingPanelPrimaryCtaTone', () => {
  it('is almost_full when every bookable session with spots is bijna vol', () => {
    expect(bookingPanelPrimaryCtaTone(makeEvent([5], {}, [15]))).toBe('almost_full')
  })

  it('stays open when one session is bijna vol and another is not', () => {
    expect(bookingPanelPrimaryCtaTone(makeEvent([5, 12], {}, [15, 15]))).toBe('open')
  })
})

describe('classNameForSessionCtaTone', () => {
  it('uses the waitlist gray for sold out', () => {
    expect(classNameForSessionCtaTone('sold_out')).toBe(PDP_WAITLIST_CTA_CLASS)
    expect(PDP_WAITLIST_CTA_CLASS).toContain('#bfbfbf')
    expect(PDP_WAITLIST_CTA_CLASS).toContain('#4c4c4c')
  })

  it('uses the almost-full red for bijna vol', () => {
    expect(classNameForSessionCtaTone('almost_full')).toBe(PDP_ALMOST_FULL_CTA_CLASS)
    expect(PDP_ALMOST_FULL_CTA_CLASS).toContain('#f7373d')
    expect(PDP_ALMOST_FULL_CTA_CLASS).toContain('#E0282E')
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
