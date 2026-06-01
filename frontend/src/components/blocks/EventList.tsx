'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { commerceClient } from '@/lib/commerce'
import { Spinner } from '@/components/ui'
import type { EventCard, EventFilters } from '@/lib/commerce'
import { getTitleSizeClass, type EventListBlock } from '@/lib/cms'
import { cn } from '@/lib/utils'

interface EventListProps {
  block: EventListBlock
}

export function EventList({ block }: EventListProps) {
  const [events, setEvents] = useState<EventCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const filters: EventFilters = {
      limit: block.limit ?? 10,
      category: block.category || undefined,
      eventType: block.eventType !== 'all' ? block.eventType : undefined,
      showPastEvents: block.showPastEvents,
    }
    commerceClient.getEvents(filters).then((data) => {
      setEvents(data)
      setLoading(false)
    })
  }, [block.limit, block.category, block.eventType, block.showPastEvents])

  if (loading) {
    return (
      <BlockWrapper block={block}>
        <div className="flex items-center gap-2 text-va-gray">
          <Spinner size="sm" />
          <span>Loading events…</span>
        </div>
      </BlockWrapper>
    )
  }

  return (
    <BlockWrapper block={block}>
      {block.title && (
        <h2 className="text-2xl font-sans font-bold mb-6">{block.title}</h2>
      )}
      {events.length === 0 ? (
        <p className="text-va-darkgray">No events found.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.handle}`}
                className="block p-4 border border-va-lightgray rounded hover:border-va-black transition-colors"
              >
                <h3 className={cn(getTitleSizeClass('h3'), 'font-sans font-semibold text-va-black')}>{event.title}</h3>
                {event.record_type && (
                  <span className="text-sm text-va-darkgray">
                    {event.record_type}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BlockWrapper>
  )
}
