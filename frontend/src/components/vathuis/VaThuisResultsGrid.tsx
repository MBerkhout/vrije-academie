import type { EventCard } from '@/lib/commerce/types'
import { VaThuisEventCard } from './VaThuisEventCard'

interface VaThuisResultsGridProps {
  events: EventCard[]
  stockThreshold: number
}

export function VaThuisResultsGrid({ events, stockThreshold }: VaThuisResultsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-3 lg:gap-6">
      {events.map((event) => (
        <VaThuisEventCard
          key={event.id}
          event={event}
          stockThreshold={stockThreshold}
        />
      ))}
    </div>
  )
}
