import type { EventCard } from '@/lib/commerce/types'
import { PlpEventCard } from './PlpEventCard'

interface PlpResultsGridProps {
  events: EventCard[]
  stockThreshold: number
}

export function PlpResultsGrid({ events, stockThreshold }: PlpResultsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-3 lg:gap-6">
      {events.map((event, index) => (
        <PlpEventCard
          key={event.id}
          event={event}
          stockThreshold={stockThreshold}
          index={index + 1}
        />
      ))}
    </div>
  )
}
