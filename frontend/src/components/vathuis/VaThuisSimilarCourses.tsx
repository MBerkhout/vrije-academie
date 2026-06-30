import { VaThuisEventCard } from '@/components/vathuis/VaThuisEventCard'
import type { EventCard } from '@/lib/commerce/types'

interface VaThuisSimilarCoursesProps {
  similar: EventCard[]
  heading?: string
  stockThreshold?: number
}

export function VaThuisSimilarCourses({
  similar,
  heading = 'Gerelateerde colleges',
  stockThreshold = 5,
}: VaThuisSimilarCoursesProps) {
  if (similar.length < 2) return null

  return (
    <section className="py-10">
      <h2 className="font-sans text-2xl font-bold text-white mb-6">{heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {similar.map((event) => (
          <VaThuisEventCard key={event.id} event={event} stockThreshold={stockThreshold} />
        ))}
      </div>
    </section>
  )
}
