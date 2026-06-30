import Link from 'next/link'
import { CONTAINER_CLASS } from '@/lib/cms'
import type { EventCard } from '@/lib/commerce/types'
import { VaThuisEventCard } from '@/components/vathuis/VaThuisEventCard'
import { VATHUIS_CATALOG_PATH } from '@/lib/routes'

interface VaThuisFeaturedGridProps {
  title: string
  events: EventCard[]
  stockThreshold: number
  catalogCtaLabel?: string | null
}

export function VaThuisFeaturedGrid({
  title,
  events,
  stockThreshold,
  catalogCtaLabel = 'Bekijk alle VA Thuis colleges',
}: VaThuisFeaturedGridProps) {
  if (!events.length) return null

  return (
    <section className={`${CONTAINER_CLASS} py-12`}>
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 className="font-sans text-2xl font-bold text-white">{title}</h2>
        <Link
          href={VATHUIS_CATALOG_PATH}
          className="text-sm font-semibold text-va-yellow hover:underline shrink-0"
        >
          {catalogCtaLabel} →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {events.map((event) => (
          <VaThuisEventCard
            key={event.id}
            event={event}
            stockThreshold={stockThreshold}
            equalizeHeight
          />
        ))}
      </div>
    </section>
  )
}
