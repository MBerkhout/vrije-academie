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
  it('stacks city, venue, and date on the left and the rest on the right', () => {
    render(<PdpLocationTabs event={event} variants={variants} settings={null} />)

    const cards = document.querySelectorAll('ul > li')
    expect(cards).toHaveLength(2)

    const amsterdam = cards[0]
    const left = amsterdam.children[0]
    const right = amsterdam.children[1]
    const leftLines = [...left.querySelectorAll('p')].map((node) => node.textContent)

    expect(leftLines[0]).toBe('Amsterdam')
    expect(leftLines[1]).toBe('Vrije Academie')
    expect(leftLines[2]).toMatch(/3 oktober 2026/)
    expect(left.textContent).not.toContain('10:30')
    expect(left.textContent).not.toContain('Testdocent')

    const rightText = right.textContent ?? ''
    expect(rightText).toContain('102')
    expect(rightText.indexOf('102')).toBeLessThan(rightText.indexOf('Beschikbaar'))
    expect(rightText.indexOf('Beschikbaar')).toBeLessThan(rightText.indexOf('tot'))
    expect(rightText.indexOf('tot')).toBeLessThan(rightText.indexOf('Testdocent 49568'))
    expect(rightText).not.toContain('Direct inschrijven')
    expect(amsterdam.children[2].textContent).toContain('Direct inschrijven')
  })

  it('puts the date under the city when there is no venue', () => {
    render(<PdpLocationTabs event={event} variants={variants} settings={null} />)

    const online = document.querySelectorAll('ul > li')[1]
    const leftLines = [...online.children[0].querySelectorAll('p')].map((node) => node.textContent)
    expect(leftLines).toEqual(['Online', expect.stringMatching(/7 oktober 2026/)])
    expect(online.children[1].textContent).toContain('Tine Zevenhuizen')
    expect(online.children[1].textContent).toContain('tot')
  })
})
