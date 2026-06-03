'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addVariantToCart } from '@/lib/commerce/cart'
import type { EventVariant } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import {
  sessionTableAvailabilityPresentation,
  shouldShowEventDates,
} from '@/lib/event-status-presentation'
import { defaultMessages } from '@/lib/i18n/messages'
import {
  formatDateWeekdayLong,
  formatPriceEur,
  formatTimeRange,
} from '@/lib/locale-format'

interface PdpLocationTabsProps {
  variants: EventVariant[]
  settings: GeneralSettings | null
  instructors?: { id: string; name: string; photo_url?: string | null }[]
  externalRegistrationUrl?: string | null
}

/** Groups variants by city (offline) or 'Online' bucket. */
function groupVariantsByCity(variants: EventVariant[]): Record<string, EventVariant[]> {
  const groups: Record<string, EventVariant[]> = {}
  for (const v of variants) {
    const city = v.event_item?.city ?? (v.event_item?.delivery_type === 'online' ? 'Online' : 'Overig')
    ;(groups[city] ??= []).push(v)
  }
  return groups
}

/** Sentinel for tab state: show every location’s sessions in one table */
const ALL_LOCATIONS = '__all__'

function sortVariantsByStart(variantsList: EventVariant[]): EventVariant[] {
  return [...variantsList].sort((a, b) => {
    const aDate = a.event_item?.start_at ? new Date(a.event_item.start_at).getTime() : Infinity
    const bDate = b.event_item?.start_at ? new Date(b.event_item.start_at).getTime() : Infinity
    return aDate - bDate
  })
}

export function PdpLocationTabs({ variants, settings, instructors = [], externalRegistrationUrl }: PdpLocationTabsProps) {
  const labels = settings?.pdp?.labels
  const t = defaultMessages.pdp
  const threshold = settings?.pdp?.lowStockThreshold ?? 5

  const groups = groupVariantsByCity(variants)
  const cities = Object.keys(groups)
  const showDate = shouldShowEventDates({
    delivery_types: [
      ...new Set(variants.map((v) => v.event_item?.delivery_type).filter(Boolean)),
    ] as string[],
    variants,
  })

  const [activeCity, setActiveCity] = useState(() =>
    cities.length > 1 ? ALL_LOCATIONS : (cities[0] ?? ''),
  )

  const router = useRouter()
  const [addingId, setAddingId] = useState<string | null>(null)

  const sessionsRef = useRef<HTMLDivElement>(null)

  const handleRegister = async (variantId: string) => {
    setAddingId(variantId)
    try {
      await addVariantToCart(variantId)
      router.push('/winkelwagen')
    } finally {
      setAddingId(null)
    }
  }

  const externalUrl = externalRegistrationUrl?.trim() || null
  const usesExternalRegistration = Boolean(externalUrl)
  const sessionCtaClassName =
    'text-sm font-bold px-4 py-2 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-block text-center'

  const sessionsHeading = labels?.sessionsHeading ?? 'Sessies'
  const allLocationsLabel = labels?.allLocationsTab ?? 'Alle locaties'
  const soldOutLabel = labels?.soldOutLabel ?? 'Volgeboekt'
  const primaryCtaLabel = labels?.primaryCta ?? 'Direct inschrijven'
  const freeTrialLabel = labels?.freeTrialBadge ?? 'Gratis proefles'
  const noSessionsMessage = labels?.noSessionsMessage ?? 'Momenteel geen sessies beschikbaar.'

  if (cities.length === 0) {
    return (
      <section id="sessies" className="py-8">
        <h2 className="font-serif text-2xl font-bold text-va-black mb-4">{sessionsHeading}</h2>
        <p className="text-va-gray">{noSessionsMessage}</p>
      </section>
    )
  }

  return (
    <section id="sessies" className="py-8" ref={sessionsRef}>
      <h2 className="font-serif text-2xl font-bold text-va-black mb-4">{sessionsHeading}</h2>

      {/* City tabs */}
      {cities.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCity(ALL_LOCATIONS)}
            className={`shrink-0 px-4 py-2 rounded-none text-sm font-medium transition-colors ${activeCity === ALL_LOCATIONS ? 'bg-va-black text-white' : 'border border-va-lightgray text-va-gray hover:bg-va-lightgray'}`}
          >
            {allLocationsLabel}
          </button>
          {cities.map((city) => (
            <button
              type="button"
              key={city}
              onClick={() => setActiveCity(city)}
              className={`shrink-0 px-4 py-2 rounded-none text-sm font-medium transition-colors ${activeCity === city ? 'bg-va-black text-white' : 'border border-va-lightgray text-va-gray hover:bg-va-lightgray'}`}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Session table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-va-lightgray text-va-gray text-xs uppercase tracking-wide">
              <th className="text-left py-3 pr-4 font-medium">{t.tableLocation}</th>
              {showDate && (
                <th className="text-left py-3 pr-4 font-medium">{t.tableDate}</th>
              )}
              <th className="text-left py-3 pr-4 font-medium">{t.tableTime}</th>
              <th className="text-left py-3 pr-4 font-medium hidden lg:table-cell">{t.tableInstructor}</th>
              <th className="text-left py-3 pr-4 font-medium">{t.tablePrice}</th>
              <th className="text-left py-3 font-medium">{t.tableAvailability}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortVariantsByStart(activeCity === ALL_LOCATIONS ? variants : (groups[activeCity] ?? [])).map((variant) => {
                const ei = variant.event_item
                const qty = ei?.available_quantity ?? 0
                const isSoldOut = qty === 0
                const isFreeTrial = ei?.is_free_trial ?? false
                const availability = sessionTableAvailabilityPresentation(qty, threshold)

                const price = (variant.prices ?? []).reduce<number | null>((min, p) => {
                  return min === null || p.amount < min ? p.amount : min
                }, null)
                const purchasable = variant.purchasable !== false

                return (
                  <tr key={variant.id} className="border-b border-va-lightgray/60 hover:bg-va-lightgray/20 transition-colors">
                    <td className="py-4 pr-4 align-middle text-va-gray">
                      {ei?.city ?? (ei?.delivery_type === 'online' ? 'Online' : '—')}
                    </td>
                    {showDate && (
                      <td className="py-4 pr-4 align-middle">
                        {ei?.start_at ? formatDateWeekdayLong(ei.start_at) : '—'}
                      </td>
                    )}
                    <td className="py-4 pr-4 align-middle text-va-gray">
                      {ei?.start_at ? formatTimeRange(ei.start_at, ei?.end_at) : '—'}
                    </td>
                    <td className="py-4 pr-4 align-middle hidden lg:table-cell">
                      <span className="text-va-gray">
                        {ei?.instructor_name?.trim() ||
                          instructors[0]?.name?.trim() ||
                          '—'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 align-middle font-medium">
                      {price ? formatPriceEur(price) : '—'}
                    </td>
                    <td className="py-4 pr-4 align-middle">
                      <span className={availability.className}>{availability.label}</span>
                    </td>
                    <td className="py-4 align-middle">
                      {purchasable ? (
                        usesExternalRegistration && !isSoldOut ? (
                          <a
                            href={externalUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${sessionCtaClassName} bg-va-yellow text-va-black hover:bg-va-yellow/90`}
                          >
                            {primaryCtaLabel}
                          </a>
                        ) : (
                          <button
                            onClick={() => void handleRegister(variant.id)}
                            disabled={isSoldOut || addingId !== null}
                            className={`${sessionCtaClassName} ${isFreeTrial ? 'bg-va-yellow/60 text-va-black hover:bg-va-yellow' : isSoldOut ? 'bg-va-lightgray text-va-gray' : 'bg-va-yellow text-va-black hover:bg-va-yellow/90'}`}
                          >
                            {isSoldOut
                              ? soldOutLabel
                              : addingId === variant.id
                              ? 'Bezig…'
                              : isFreeTrial
                              ? freeTrialLabel
                              : primaryCtaLabel}
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-va-gray">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
