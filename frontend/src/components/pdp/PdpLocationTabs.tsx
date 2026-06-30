'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addVariantToCart } from '@/lib/commerce/cart'
import type { EventVariant } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import {
  minVariantPriceCents,
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

type SessionSortField = 'date' | 'location'
type SessionSortDirection = 'asc' | 'desc'

/** Sentinel for tab state: show every location's sessions in one list */
const ALL_LOCATIONS = '__all__'

function isOnlineVariant(v: EventVariant): boolean {
  return v.event_item?.delivery_type === 'online'
}

function isOfflineVariant(v: EventVariant): boolean {
  return v.event_item?.delivery_type === 'offline'
}

/** Groups offline variants by city. */
function groupOfflineVariantsByCity(variants: EventVariant[]): Record<string, EventVariant[]> {
  const groups: Record<string, EventVariant[]> = {}
  for (const v of variants) {
    if (!isOfflineVariant(v)) continue
    const city = v.event_item?.city ?? 'Overig'
    ;(groups[city] ??= []).push(v)
  }
  return groups
}

function sortVariantsByStart(variantsList: EventVariant[]): EventVariant[] {
  return sortVariants(variantsList, 'date', 'asc')
}

function sortVariants(
  variantsList: EventVariant[],
  field: SessionSortField,
  direction: SessionSortDirection,
): EventVariant[] {
  const mult = direction === 'asc' ? 1 : -1
  return [...variantsList].sort((a, b) => {
    if (field === 'date') {
      const aDate = a.event_item?.start_at ? new Date(a.event_item.start_at).getTime() : Infinity
      const bDate = b.event_item?.start_at ? new Date(b.event_item.start_at).getTime() : Infinity
      return (aDate - bDate) * mult
    }
    const aLoc = [a.event_item?.city, a.event_item?.location_name].filter(Boolean).join(' ')
    const bLoc = [b.event_item?.city, b.event_item?.location_name].filter(Boolean).join(' ')
    return aLoc.localeCompare(bLoc, 'nl') * mult
  })
}

function sessionCityLabel(ei: EventVariant['event_item']): string {
  return ei?.city ?? '—'
}

/** Venue / location line from Salesforce `Product_Location_Name__c`. */
function sessionVenueLine(ei: EventVariant['event_item']): string | null {
  return ei?.location_name?.trim() || null
}

function instructorName(
  ei: EventVariant['event_item'],
  instructors: { name: string }[],
): string {
  return ei?.instructor_name?.trim() || instructors[0]?.name?.trim() || '—'
}

function SortIndicator({ active, direction }: { active: boolean; direction: SessionSortDirection }) {
  if (!active) return null
  return (
    <span className="ml-1 inline-block" aria-hidden>
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  )
}

export function PdpLocationTabs({ variants, settings, instructors = [], externalRegistrationUrl }: PdpLocationTabsProps) {
  const labels = settings?.pdp?.labels
  const t = defaultMessages.pdp
  const threshold = settings?.pdp?.lowStockThreshold ?? 5

  const onlineVariants = sortVariantsByStart(variants.filter(isOnlineVariant))
  const offlineVariants = sortVariantsByStart(variants.filter(isOfflineVariant))

  const groups = groupOfflineVariantsByCity(offlineVariants)
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
  const [sortField, setSortField] = useState<SessionSortField>('date')
  const [sortDirection, setSortDirection] = useState<SessionSortDirection>('asc')

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

  const physicalSessionsHeading =
    labels?.physicalSessionsHeading ??
    labels?.sessionsHeading ??
    t.physicalSessionsHeading ??
    'Fysieke sessies'
  const onlineSessionsHeading = labels?.onlineSessionsHeading ?? t.onlineSessionsHeading ?? 'Bezoek deze lezing online'
  const onlineZoomInfo =
    labels?.onlineSessionsZoomInfo ??
    t.onlineSessionsZoomInfo ??
    'Je ontvangt 1 uur voor aanvang een link waarmee je de activiteit via het programma Zoom kunt bijwonen.'
  const onlineReplayInfo =
    labels?.onlineSessionsReplayInfo ??
    t.onlineSessionsReplayInfo ??
    'Binnen 2 werkdagen ontvang je een link waarmee je de registratie van de lezing nog 7 dagen kunt terugkijken.'
  const sortLabel = labels?.sessionsSortLabel ?? t.sessionsSortLabel ?? 'Sorteren op'
  const sortDateLabel = labels?.sessionsSortDate ?? t.sessionsSortDate ?? t.tableDate
  const sortLocationLabel = labels?.sessionsSortLocation ?? t.sessionsSortLocation ?? t.tableLocation
  const allLocationsLabel = labels?.allLocationsTab ?? 'Alle locaties'
  const soldOutLabel = labels?.soldOutLabel ?? 'Volgeboekt'
  const primaryCtaLabel = labels?.primaryCta ?? 'Direct inschrijven'
  const freeTrialLabel = labels?.freeTrialBadge ?? 'Gratis proefles'
  const noSessionsMessage = labels?.noSessionsMessage ?? 'Momenteel geen sessies beschikbaar.'

  const canSortPhysical = offlineVariants.length > 1

  const filteredOfflineVariants =
    activeCity === ALL_LOCATIONS ? offlineVariants : (groups[activeCity] ?? [])

  const sortedOfflineVariants = canSortPhysical
    ? sortVariants(filteredOfflineVariants, sortField, sortDirection)
    : sortVariantsByStart(filteredOfflineVariants)

  const handleSortFieldChange = (field: SessionSortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSortDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortField(e.target.value as SessionSortField)
    setSortDirection('asc')
  }

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

  const renderSortableHeader = (field: SessionSortField, label: string) => {
    if (!canSortPhysical) {
      return <th className="text-left py-3 pr-4 font-medium">{label}</th>
    }
    const isActive = sortField === field
    return (
      <th className="text-left py-3 pr-4 font-medium">
        <button
          type="button"
          onClick={() => handleSortFieldChange(field)}
          className="inline-flex items-center uppercase tracking-wide hover:text-va-black transition-colors"
          aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          {label}
          <SortIndicator active={isActive} direction={sortDirection} />
        </button>
      </th>
    )
  }

  if (onlineVariants.length === 0 && offlineVariants.length === 0) {
    return (
      <section id="sessies" className="py-8">
        <p className="text-va-gray">{noSessionsMessage}</p>
      </section>
    )
  }

  return (
    <section id="sessies" className="py-8" ref={sessionsRef}>
      {/* Online sessions */}
      {onlineVariants.length > 0 && (
        <div className={offlineVariants.length > 0 ? 'mb-10' : undefined}>
          <div className="inline-block max-w-2xl border border-va-lightgray-300 bg-va-lightgray-100 px-5 py-6 md:px-6 md:py-7">
            <h2 className="mb-5 font-sans text-xl font-bold text-va-black md:text-2xl">
              {onlineSessionsHeading}
            </h2>

            <div className="flex flex-col gap-5">
              {onlineVariants.map((variant, index) => {
                const ei = variant.event_item
                const qty = ei?.available_quantity ?? 0
                const isSoldOut = qty === 0
                const isFreeTrial = ei?.is_free_trial ?? false
                const price = minVariantPriceCents(variant)
                const instructor = instructorName(ei, instructors)

                return (
                  <div
                    key={variant.id}
                    className={index > 0 ? 'border-t border-va-lightgray-300 pt-5' : undefined}
                  >
                    <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-x-6">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {ei?.start_at ? (
                          <span className="font-medium text-va-black">
                            {formatDateWeekdayLong(ei.start_at)}
                          </span>
                        ) : null}
                        <span className="text-sm text-va-black">
                          {ei?.start_at ? formatTimeRange(ei.start_at, ei.end_at) : '—'}
                        </span>
                        {instructor !== '—' ? (
                          <span className="text-sm text-va-gray">{instructor}</span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-4 md:contents">
                        {price ? (
                          <span className="shrink-0 text-base font-semibold tabular-nums text-va-black md:text-right">
                            {formatPriceEur(price)}
                          </span>
                        ) : (
                          <span className="hidden md:block" aria-hidden />
                        )}
                        <div className="shrink-0 md:justify-self-end">
                          {renderSessionCta(variant, {
                            className: `${sessionCtaDesktopClassName} w-full whitespace-nowrap sm:w-auto`,
                            isSoldOut,
                            isFreeTrial,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <p className="border-t border-va-lightgray-300 pt-4 text-sm leading-relaxed text-va-gray">
                {onlineZoomInfo} {onlineReplayInfo}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Physical sessions */}
      {offlineVariants.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="font-sans text-2xl font-bold text-va-black">{physicalSessionsHeading}</h2>
            {canSortPhysical && (
              <select
                value={sortField}
                onChange={handleSortDropdownChange}
                aria-label={sortLabel}
                className="text-sm border border-va-lightgray px-3 py-2 text-va-black bg-white focus:outline-none focus:ring-2 focus:ring-va-yellow"
              >
                <option value="date">{sortDateLabel}</option>
                <option value="location">{sortLocationLabel}</option>
              </select>
            )}
          </div>

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
            {sortedOfflineVariants.map((variant) => {
              const ei = variant.event_item
              const qty = ei?.available_quantity ?? 0
              const isSoldOut = qty === 0
              const isFreeTrial = ei?.is_free_trial ?? false
              const availability = sessionTableAvailabilityPresentation(qty, threshold)
              const price = minVariantPriceCents(variant)
              const city = sessionCityLabel(ei)
              const venue = sessionVenueLine(ei)
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
                  {renderSortableHeader('location', t.tableLocation)}
                  {showDate && renderSortableHeader('date', t.tableDate)}
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
                {sortedOfflineVariants.map((variant) => {
                  const ei = variant.event_item
                  const qty = ei?.available_quantity ?? 0
                  const isSoldOut = qty === 0
                  const isFreeTrial = ei?.is_free_trial ?? false
                  const availability = sessionTableAvailabilityPresentation(qty, threshold)
                  const price = minVariantPriceCents(variant)

                  return (
                    <tr
                      key={variant.id}
                      className="border-b border-va-lightgray/60 hover:bg-va-lightgray/20 transition-colors"
                    >
                      <td className="py-4 pr-4 align-middle text-va-gray">
                        <div>{sessionCityLabel(ei)}</div>
                        {sessionVenueLine(ei) ? (
                          <div className="text-xs mt-0.5">{sessionVenueLine(ei)}</div>
                        ) : null}
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
        </div>
      )}
    </section>
  )
}
