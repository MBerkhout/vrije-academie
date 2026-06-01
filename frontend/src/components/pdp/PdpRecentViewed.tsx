'use client'

import { useEffect, useState } from 'react'
import { PlpEventCard } from '@/components/plp/PlpEventCard'
import {
  commerceClient,
  getRecentViewedHandlesLocal,
  handlesForRecentDisplay,
  mergeRecentViewedHandles,
  parseRecentViewedHandles,
  type EventCard,
} from '@/lib/commerce'
import { useCustomer } from '@/lib/commerce/CustomerProvider'

interface PdpRecentViewedProps {
  currentHandle: string
  heading?: string
  stockThreshold?: number
}

/**
 * Client-only “recent bekeken” — not server-rendered so shared PDP cache cannot leak history.
 */
export function PdpRecentViewed({
  currentHandle,
  heading = 'Recent bekeken',
  stockThreshold = 5,
}: PdpRecentViewedProps) {
  const { customer } = useCustomer()
  const [events, setEvents] = useState<EventCard[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const local = getRecentViewedHandlesLocal()
      const remote = parseRecentViewedHandles(customer?.metadata)
      const merged = mergeRecentViewedHandles(local, remote)
      const displayHandles = handlesForRecentDisplay(merged, currentHandle)

      if (displayHandles.length > 0) {
        const results = await Promise.all(
          displayHandles.map((handle) => commerceClient.getEvent(handle))
        )
        const valid = results.filter((e): e is EventCard => e != null)
        if (!cancelled && valid.length > 0) {
          setEvents(valid)
        }
      }

      if (!cancelled) {
        void commerceClient.recordRecentViewedHandle(currentHandle)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentHandle, customer?.metadata])

  if (events.length === 0) return null

  return (
    <section className="py-10" aria-label={heading}>
      <h2 className="font-serif text-2xl font-bold text-va-black mb-6">{heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {events.map((event) => (
          <PlpEventCard
            key={event.id}
            event={event}
            stockThreshold={stockThreshold}
            squareCorners
          />
        ))}
      </div>
    </section>
  )
}
