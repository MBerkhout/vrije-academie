import { PlpEventCard } from '@/components/plp/PlpEventCard'
import type { EventCard } from '@/lib/commerce/types'

interface PdpSimilarCoursesProps {
  similar: EventCard[]
  heading?: string
  stockThreshold?: number
}

/** Related activities (same category, popularity sort via store API). */
export function PdpSimilarCourses({ similar, heading = 'Gerelateerde activiteiten', stockThreshold = 5 }: PdpSimilarCoursesProps) {
  if (similar.length < 2) return null

  return (
    <section className="py-10">
      <h2 className="font-serif text-2xl font-bold text-va-black mb-6">{heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {similar.map((event) => (
          <PlpEventCard key={event.id} event={event} stockThreshold={stockThreshold} squareCorners />
        ))}
      </div>
    </section>
  )
}
