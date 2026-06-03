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

/** Sentinel for tab state: show every location’s sessions in one list */
const ALL_LOCATIONS = '__all__'

function sortVariantsByStart(variantsList: EventVariant[]): EventVariant[] {
  return [...variantsList].sort((a, b) => {
    const aDate = a.event_item?.start_at ? new Date(a.event_item.start_at).getTime() : Infinity
    const bDate = b.event_item?.start_at ? new Date(b.event_item.start_at).getTime() : Infinity
    return aDate - bDate
  })
}

function sessionCityLabel(ei: EventVariant['event_item']): string {
  return ei?.city ?? (ei?.delivery_type === 'online' ? 'Online' : '—')
}

/** Variant title when it adds detail beyond the city label (e.g. venue name). */
function sessionVenueLine(variant: EventVariant): string | null {
  const city = sessionCityLabel(variant.event_item)
  const title = variant.title?.trim()
  if (!title || title === city) return null
  return title
}

function minVariantPrice(variant: EventVariant): number | null {
  return (variant.prices ?? []).reduce<number | null>((min, p) => {
    return min === null || p.amount < min ? p.amount : min
  }, null)
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
  const sessionCtaMobileClassName =
    'w-full text-sm font-bold uppercase tracking-wide px-4 py-3 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center'
  const sessionCtaDesktopClassName =
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

  const sortedVariants = sortVariantsByStart(
    activeCity === ALL_LOCATIONS ? variants : (groups[activeCity] ?? []),
  )

  const renderSessionCta = (
    variant: EventVariant,
    opts: { className: string; isSoldOut: boolean; isFreeTrial: boolean },
  ) => {
    const { className, isSoldOut, isFreeTrial } = opts
    const ctaLabel = isSoldOut
      ? soldOutLabel
      : addingId === variant.id
        ? 'Bezig…'
        : isFreeTrial
          ? freeTrialLabel
          : primaryCtaLabel

    if (variant.purchasable === false) {
      return <span className="text-sm text-va-gray">—</span>
    }

    if (usesExternalRegistration && !isSoldOut) {
      return (
        <a
          href={externalUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} bg-va-yellow text-va-black hover:bg-va-yellow/90`}
        >
          {primaryCtaLabel}
        </a>
      )
    }

    return (
      <button
        type="button"
        onClick={() => void handleRegister(variant.id)}
        disabled={isSoldOut || addingId !== null}
        className={`${className} ${isFreeTrial ? 'bg-va-yellow/60 text-va-black hover:bg-va-yellow' : isSoldOut ? 'bg-va-lightgray text-va-gray' : 'bg-va-yellow text-va-black hover:bg-va-yellow/90'}`}
      >
        {ctaLabel}
      </button>
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

      {/* Mobile: stacked session cards */}
      <ul className="divide-y divide-va-black border-t border-va-black md:hidden">
        {sortedVariants.map((variant) => {
          const ei = variant.event_item
          const qty = ei?.available_quantity ?? 0
          const isSoldOut = qty === 0
          const isFreeTrial = ei?.is_free_trial ?? false
          const availability = sessionTableAvailabilityPresentation(qty, threshold)
          const price = minVariantPrice(variant)
          const city = sessionCityLabel(ei)
          const venue = sessionVenueLine(variant)
          const instructor =
            ei?.instructor_name?.trim() || instructors[0]?.name?.trim() || null

          return (
            <li key={variant.id} className="py-6 first:pt-6">
              <div className="flex flex-col gap-1.5 text-sm">
                <p className="font-semibold text-va-black">{city}</p>
                {venue ? <p className="text-va-gray leading-snug">{venue}</p> : null}
                {(showDate && ei?.start_at) || ei?.start_at ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-va-black">
                      {showDate && ei?.start_at ? (
                        <>
                          <span>{formatDateWeekdayLong(ei.start_at)}</span>
                          <span className="text-va-gray">
                            {' '}
                            {formatTimeRange(ei.start_at, ei.end_at, { separator: ' tot ' })}
                          </span>
                        </>
                      ) : (
                        <span className="text-va-gray">
                          {formatTimeRange(ei.start_at!, ei.end_at, { separator: ' tot ' })}
                        </span>
                      )}
                    </p>
                    <span className={`${availability.className} shrink-0`}>
                      {availability.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <span className={availability.className}>{availability.label}</span>
                  </div>
                )}
                {instructor ? <p className="text-va-gray">{instructor}</p> : null}
                {price ? <p className="font-medium text-va-black">{formatPriceEur(price)}</p> : null}
              </div>
              <div className="mt-4">
                {renderSessionCta(variant, {
                  className: sessionCtaMobileClassName,
                  isSoldOut,
                  isFreeTrial,
                })}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Desktop: session table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-va-lightgray text-va-gray text-xs uppercase tracking-wide">
              <th className="text-left py-3 pr-4 font-medium">{t.tableLocation}</th>
              {showDate && (
                <th className="text-left py-3 pr-4 font-medium">{t.tableDate}</th>
              )}
              <th className="text-left py-3 pr-4 font-medium">{t.tableTime}</th>
              <th className="text-left py-3 pr-4 font-medium hidden lg:table-cell">
                {t.tableInstructor}
              </th>
              <th className="text-left py-3 pr-4 font-medium">{t.tablePrice}</th>
              <th className="text-left py-3 font-medium">{t.tableAvailability}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortedVariants.map((variant) => {
              const ei = variant.event_item
              const qty = ei?.available_quantity ?? 0
              const isSoldOut = qty === 0
              const isFreeTrial = ei?.is_free_trial ?? false
              const availability = sessionTableAvailabilityPresentation(qty, threshold)
              const price = minVariantPrice(variant)

              return (
                <tr
                  key={variant.id}
                  className="border-b border-va-lightgray/60 hover:bg-va-lightgray/20 transition-colors"
                >
                  <td className="py-4 pr-4 align-middle text-va-gray">{sessionCityLabel(ei)}</td>
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
                      {ei?.instructor_name?.trim() || instructors[0]?.name?.trim() || '—'}
                    </span>
                  </td>
                  <td className="py-4 pr-4 align-middle font-medium">
                    {price ? formatPriceEur(price) : '—'}
                  </td>
                  <td className="py-4 pr-4 align-middle">
                    <span className={availability.className}>{availability.label}</span>
                  </td>
                  <td className="py-4 align-middle">
                    {renderSessionCta(variant, {
                      className: sessionCtaDesktopClassName,
                      isSoldOut,
                      isFreeTrial,
                    })}
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
