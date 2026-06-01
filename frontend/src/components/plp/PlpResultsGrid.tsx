import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import type { EventCard } from '@/lib/commerce/types'
import { PlpEventCard } from './PlpEventCard'

interface PlpResultsGridProps {
  events: EventCard[]
  stockThreshold: number
  filterState?: PlpFilterState
}

export function PlpResultsGrid({ events, stockThreshold, filterState }: PlpResultsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <PlpEventCard
          key={event.id}
          event={event}
          stockThreshold={stockThreshold}
          filterState={filterState}
        />
      ))}
    </div>
  )
}
