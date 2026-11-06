import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { EventCard } from '@/lib/commerce/types'

vi.mock('@/lib/commerce', () => ({
  commerceClient: {
    getEventsByHandles: vi.fn(),
    getEvent: vi.fn(),
  },
}))

import { commerceClient } from '@/lib/commerce'
import { resolveProductRowEvents } from './resolve-product-row-events'

const alpha: EventCard = { id: '1', handle: 'alpha', title: 'Alpha' } as EventCard
const beta: EventCard = { id: '2', handle: 'beta', title: 'Beta' } as EventCard
const expired: EventCard = {
  id: '3',
  handle: 'expired',
  title: 'Expired',
  variants: [],
} as EventCard

describe('resolveProductRowEvents', () => {
  beforeEach(() => {
    vi.mocked(commerceClient.getEventsByHandles).mockReset()
    vi.mocked(commerceClient.getEvent).mockReset()
  })

  it('returns listing rows in order when hiding expired (default)', async () => {
    vi.mocked(commerceClient.getEventsByHandles).mockResolvedValue([beta, alpha])

    const events = await resolveProductRowEvents(['beta', 'expired', 'alpha'])

    expect(events.map((e) => e.handle)).toEqual(['beta', 'alpha'])
    expect(commerceClient.getEvent).not.toHaveBeenCalled()
  })

  it('fetches PDP detail for missing handles when filter is off', async () => {
    vi.mocked(commerceClient.getEventsByHandles).mockResolvedValue([alpha])
    vi.mocked(commerceClient.getEvent).mockResolvedValue(expired)

    const events = await resolveProductRowEvents(['alpha', 'expired'], {
      hideWithoutUpcomingSessions: false,
    })

    expect(commerceClient.getEvent).toHaveBeenCalledWith('expired')
    expect(events.map((e) => e.handle)).toEqual(['alpha', 'expired'])
  })
})
