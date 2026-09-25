import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { EventCard, EventVariant } from '@/lib/commerce/types'
import { PdpLocationTabs } from './PdpLocationTabs'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/commerce/cart', () => ({
  addVariantToCart: vi.fn(),
}))

vi.mock('@/lib/analytics/events/ecommerce', () => ({
  trackFilterChange: vi.fn(),
}))

vi.mock('@/components/waitlist/WaitlistTrigger', () => ({
  WaitlistTrigger: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
}))

function variant(partial: EventVariant): EventVariant {
  return partial
}

const event: EventCard = {
  id: 'prod_1',
  handle: 'test-cursus',
  title: 'Testcursus',
}

const variants: EventVariant[] = [
  variant({
    id: 'var_ams',
    title: 'Amsterdam',
    prices: [{ amount: 10200, currency_code: 'eur' }],
    event_item: {
      id: 'ei_ams',
      delivery_type: 'offline',
      available_quantity: 12,
      capacity: 20,
      start_at: '2026-10-03T08:30:00.000Z',
      end_at: '2026-10-03T14:15:00.000Z',
      city: 'Amsterdam',
      location_name: 'Vrije Academie',
      is_free_trial: false,
      instructor_name: 'Testdocent 49568',
    },
  }),
  variant({
    id: 'var_online',
    title: 'Online',
    prices: [{ amount: 6500, currency_code: 'eur' }],
    event_item: {
      id: 'ei_online',
      delivery_type: 'online',
      available_quantity: 20,
      capacity: 40,
      start_at: '2026-10-07T08:00:00.000Z',
      end_at: '2026-10-07T12:30:00.000Z',
      city: null,
      location_name: null,
      is_free_trial: false,
      instructor_name: 'Tine Zevenhuizen',
    },
  }),
]

describe('PdpLocationTabs mobile session cards', () => {
  it('stacks city, venue, date, time, and teacher on the left', () => {
    render(<PdpLocationTabs event={event} variants={variants} settings={null} />)

    const cards = document.querySelectorAll('ul > li')
    expect(cards).toHaveLength(2)

    const amsterdam = cards[0]
    const left = amsterdam.children[0]
    const right = amsterdam.children[1]
    const leftText = left.textContent ?? ''

    expect(leftText.indexOf('Amsterdam')).toBeLessThan(leftText.indexOf('Vrije Academie'))
    expect(leftText.indexOf('Vrije Academie')).toBeLessThan(leftText.indexOf('oktober 2026'))
    expect(leftText.indexOf('oktober 2026')).toBeLessThan(leftText.indexOf('tot'))
    expect(leftText.indexOf('tot')).toBeLessThan(leftText.indexOf('Testdocent 49568'))

    const rightText = right.textContent ?? ''
    expect(rightText.indexOf('102')).toBeGreaterThanOrEqual(0)
    expect(rightText.indexOf('102')).toBeLessThan(rightText.indexOf('Beschikbaar'))
    expect(rightText.indexOf('Beschikbaar')).toBeLessThan(rightText.indexOf('Direct inschrijven'))
    expect(rightText).not.toContain('tot')
    expect(rightText).not.toContain('Testdocent')
    expect(amsterdam.children).toHaveLength(2)
  })

  it('puts the date, time, and teacher under the city when there is no venue', () => {
    render(<PdpLocationTabs event={event} variants={variants} settings={null} />)

    const online = document.querySelectorAll('ul > li')[1]
    const leftText = online.children[0].textContent ?? ''
    expect(leftText.indexOf('Online')).toBeLessThan(leftText.indexOf('oktober 2026'))
    expect(leftText.indexOf('oktober 2026')).toBeLessThan(leftText.indexOf('tot'))
    expect(leftText.indexOf('tot')).toBeLessThan(leftText.indexOf('Tine Zevenhuizen'))
    expect(online.children[1].textContent).toContain('65')
    expect(online.children[1].textContent).toContain('Beschikbaar')
    expect(online.children[1].textContent).toContain('Direct inschrijven')
  })
})
