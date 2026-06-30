import Link from 'next/link'
import { VaThuisEventCard } from '@/components/vathuis/VaThuisEventCard'
import type { EventCard } from '@/lib/commerce/types'
import { VATHUIS_CATALOG_PATH } from '@/lib/routes'

interface Props {
  items: EventCard[]
  primaryCategory?: { slug: string; label: string } | null
}

/** VA Thuis cross-sell on the thank-you page (shows from 1 item). */
export function ThankYouVathuisRecommendations({ items, primaryCategory }: Props) {
  if (!items.length) return null

  const categoryLabel = primaryCategory?.label ?? null
  const catalogHref = primaryCategory?.slug
    ? `${VATHUIS_CATALOG_PATH}?category=${encodeURIComponent(primaryCategory.slug)}`
    : VATHUIS_CATALOG_PATH

  const heading = categoryLabel
    ? `Duik alvast in ${categoryLabel} met onze online cursussen`
    : 'Begin alvast met kijken'

  const ctaLabel = categoryLabel
    ? `Alles van ${categoryLabel} online bekijken`
    : 'Ontdek VA Thuis online'

  return (
    <section className="bg-va-black px-4 py-8 md:px-8 md:py-10 space-y-6">
      <h2 className="font-sans text-xl md:text-2xl font-bold text-white">{heading}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {items.map((event) => (
          <VaThuisEventCard key={event.id} event={event} stockThreshold={5} equalizeHeight />
        ))}
      </div>
      <div className="pt-2">
        <Link
          href={catalogHref}
          className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-white border border-white/40 px-6 py-3 hover:bg-white/10 transition-colors"
        >
          {ctaLabel}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
