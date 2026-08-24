'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveryTypeIcon } from '@/components/ui/DeliveryTypeIcon'
import { addVariantToCart } from '@/lib/commerce/cart'
import { trackFilterChange } from '@/lib/analytics/events/ecommerce'
import type { EventCard, EventInstructor, EventVariant } from '@/lib/commerce/types'
import { PdpInstructorHoverCard } from '@/components/pdp/PdpInstructorHoverCard'
import { resolveSessionInstructor } from '@/components/pdp/resolve-session-instructor'
import type { GeneralSettings } from '@/lib/cms/types'
import {
  minVariantPriceCents,
  sessionTableAvailabilityPresentation,
  shouldShowEventDates,
} from '@/lib/event-status-presentation'
import { defaultMessages } from '@/lib/i18n/messages'
import { sessionExternalRegistrationUrl } from '@/lib/commerce/external-registration-url'
import {
  formatDateWeekdayLong,
  formatPriceEur,
  formatTimeRange,
} from '@/lib/locale-format'

interface PdpLocationTabsProps {
  event: EventCard
  variants: EventVariant[]
  settings: GeneralSettings | null
  instructors?: EventInstructor[]
  externalRegistrationUrl?: string | null
}

type SessionSortField = 'date' | 'location'
type SessionSortDirection = 'asc' | 'desc'
type DeliveryFilter = 'both' | 'online' | 'offline'

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
    const aLoc = sessionLocationSortKey(a)
    const bLoc = sessionLocationSortKey(b)
    return aLoc.localeCompare(bLoc, 'nl') * mult
  })
}

function sessionLocationSortKey(variant: EventVariant): string {
  if (isOnlineVariant(variant)) return 'Online'
  const ei = variant.event_item
  return [ei?.city, ei?.location_name].filter(Boolean).join(' ')
}

function sessionCityLabel(ei: EventVariant['event_item'], isOnline: boolean): string {
  if (isOnline) return 'Online'
  return ei?.city ?? '—'
}

/** Venue / location line from Salesforce `Product_Location_Name__c`. */
function sessionVenueLine(ei: EventVariant['event_item'], isOnline: boolean): string | null {
  if (isOnline) return null
  return ei?.location_name?.trim() || null
}

function SortIndicator({ active, direction }: { active: boolean; direction: SessionSortDirection }) {
  if (!active) return null
  return (
    <span className="ml-1 inline-block" aria-hidden>
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  )
}

function filterVariantsByDeliveryAndCity(
  deliveryFilter: DeliveryFilter,
  activeCity: string,
  onlineVariants: EventVariant[],
  offlineVariants: EventVariant[],
  groups: Record<string, EventVariant[]>,
): EventVariant[] {
  const filteredOffline =
    activeCity === ALL_LOCATIONS ? offlineVariants : (groups[activeCity] ?? [])

  if (deliveryFilter === 'online') return onlineVariants
  if (deliveryFilter === 'offline') return filteredOffline
  return [...onlineVariants, ...filteredOffline]
}

function sessionInstructorLabel(
  eventItem: EventVariant['event_item'],
  instructors: EventInstructor[],
  featured?: EventInstructor | null
): string | null {
  return (
    eventItem?.instructor_name?.trim() ||
    instructors[0]?.name?.trim() ||
    featured?.name?.trim() ||
    null
  )
}

function SessionInstructorName({
  eventItem,
  instructors,
  featured,
  className,
}: {
  eventItem: EventVariant['event_item']
  instructors: EventInstructor[]
  featured?: EventInstructor | null
  className?: string
}) {
  const label = sessionInstructorLabel(eventItem, instructors, featured)
  if (!label) return <span className={className}>—</span>
  const profile = resolveSessionInstructor(eventItem?.instructor_name, instructors, featured)
  return <PdpInstructorHoverCard name={label} instructor={profile} className={className} />
}

export function PdpLocationTabs({
  event,
  variants,
  settings,
  instructors = [],
  externalRegistrationUrl,
}: PdpLocationTabsProps) {
  const profiles = instructors.length > 0 ? instructors : (event.instructors ?? [])
  const labels = settings?.pdp?.labels
  const t = defaultMessages.pdp
  const threshold = settings?.pdp?.lowStockThreshold ?? 5

  const onlineVariants = sortVariantsByStart(variants.filter(isOnlineVariant))
  const offlineVariants = sortVariantsByStart(variants.filter(isOfflineVariant))
  const hasOnline = onlineVariants.length > 0
  const hasOffline = offlineVariants.length > 0
  const showDeliveryFilter = hasOnline && hasOffline

  const groups = groupOfflineVariantsByCity(offlineVariants)
  const cities = Object.keys(groups).sort((a, b) =>
    a.localeCompare(b, 'nl', { sensitivity: 'base' }),
  )
  const showDate = shouldShowEventDates({
    delivery_types: [
      ...new Set(variants.map((v) => v.event_item?.delivery_type).filter(Boolean)),
    ] as string[],
    variants,
  })

  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('both')
  const [activeCity, setActiveCity] = useState(() =>
    cities.length > 1 ? ALL_LOCATIONS : (cities[0] ?? ''),
  )
  const [sortField, setSortField] = useState<SessionSortField>('date')
  const [sortDirection, setSortDirection] = useState<SessionSortDirection>('asc')

  const router = useRouter()
  const [addingId, setAddingId] = useState<string | null>(null)

  const sessionsRef = useRef<HTMLDivElement>(null)

  const handleRegister = async (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId) ?? null
    setAddingId(variantId)
    try {
      await addVariantToCart(variantId, { event, variant })
      router.push('/winkelwagen')
    } finally {
      setAddingId(null)
    }
  }

  const productExternalUrl = externalRegistrationUrl?.trim() || null
  const sessionCtaMobileClassName =
    'shrink-0 text-sm font-bold uppercase tracking-wide px-4 py-2 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center'
  const sessionCtaDesktopClassName =
    'text-sm font-bold px-4 py-2 rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-block text-center'

  const sessionsHeading = labels?.sessionsHeading ?? t.locationSessions ?? 'Sessies'
  const deliveryFilterBothLabel = t.deliveryFilterBoth ?? 'Alle'
  const deliveryFilterOnlineLabel = t.deliveryFilterOnline ?? 'Online'
  const deliveryFilterOfflineLabel = t.deliveryFilterOffline ?? 'Fysiek'
  const sortLabel = labels?.sessionsSortLabel ?? t.sessionsSortLabel ?? 'Sorteren op'
  const sortDateLabel = labels?.sessionsSortDate ?? t.sessionsSortDate ?? t.tableDate
  const sortLocationLabel = labels?.sessionsSortLocation ?? t.sessionsSortLocation ?? t.tableLocation
  const allLocationsLabel = labels?.allLocationsTab ?? t.locationAll ?? 'Alle locaties'
  const soldOutLabel = labels?.soldOutLabel ?? 'Volgeboekt'
  const primaryCtaLabel = labels?.primaryCta ?? 'Direct inschrijven'
  const freeTrialLabel = labels?.freeTrialBadge ?? 'Gratis proefles'
  const noSessionsMessage = labels?.noSessionsMessage ?? 'Momenteel geen sessies beschikbaar.'

  const filteredVariants = filterVariantsByDeliveryAndCity(
    showDeliveryFilter ? deliveryFilter : hasOnline ? 'online' : 'offline',
    activeCity,
    onlineVariants,
    offlineVariants,
    groups,
  )

  const canSort = filteredVariants.length > 1
  const sortedVariants = canSort
    ? sortVariants(filteredVariants, sortField, sortDirection)
    : sortVariantsByStart(filteredVariants)

  const skipInitialFilterTrack = useRef(true)
  useEffect(() => {
    if (skipInitialFilterTrack.current) {
      skipInitialFilterTrack.current = false
      return
    }
    trackFilterChange({
      scope: 'activiteit_detail',
      filterName: 'modaliteit',
      filterValue: deliveryFilter,
      resultsCount: sortedVariants.length,
      itemId: event.handle,
    })
  }, [deliveryFilter, event.handle, sortedVariants.length])

  const skipInitialCityTrack = useRef(true)
  useEffect(() => {
    if (skipInitialCityTrack.current) {
      skipInitialCityTrack.current = false
      return
    }
    if (activeCity === ALL_LOCATIONS) return
    trackFilterChange({
      scope: 'activiteit_detail',
      filterName: 'plaats',
      filterValue: activeCity,
      resultsCount: sortedVariants.length,
      itemId: event.handle,
    })
  }, [activeCity, event.handle, sortedVariants.length])

  const showLocationTabs =
    (deliveryFilter === 'both' || deliveryFilter === 'offline' || !showDeliveryFilter) &&
    hasOffline &&
    cities.length > 1 &&
    deliveryFilter !== 'online'

  const deliveryFilterButtonClass = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-none text-sm font-medium transition-colors ${
      active
        ? 'bg-va-yellow text-va-black'
        : 'border border-va-lightgray text-va-gray hover:bg-va-lightgray'
    }`

  /** Mobile: align left with container, bleed tabs to the right viewport edge; themed scrollbar. */
  const sessionFilterScrollClass =
    'flex gap-2 overflow-x-auto pb-2 scrollbar-va max-md:-mr-4 max-md:pr-4'

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

  const handleLocationChange = (city: string) => {
    setActiveCity(city)
    if (showDeliveryFilter) setDeliveryFilter('offline')
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

    const sessionExternalUrl = sessionExternalRegistrationUrl(variant, productExternalUrl)

    if (sessionExternalUrl && !isSoldOut) {
      return (
        <a
          href={sessionExternalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} bg-va-yellow text-va-black hover:bg-va-yellow/90`}
        >
          {primaryCtaLabel}
        </a>
      )
    }

    if (variant.purchasable === false) {
      return <span className="text-sm text-va-gray">—</span>
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
    if (!canSort) {
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

  if (!hasOnline && !hasOffline) {
    return (
      <section id="sessies" className="py-8">
        <p className="text-va-gray">{noSessionsMessage}</p>
      </section>
    )
  }

  return (
    <section id="sessies" className="py-8" ref={sessionsRef}>
      {/* Delivery type filter */}
      {showDeliveryFilter && (
        <div
          className={`mb-4 ${sessionFilterScrollClass}`}
          role="tablist"
          aria-label="Beschikbaarheid"
        >
          <button
            type="button"
            role="tab"
            aria-selected={deliveryFilter === 'both'}
            onClick={() => setDeliveryFilter('both')}
            className={deliveryFilterButtonClass(deliveryFilter === 'both')}
          >
            <DeliveryTypeIcon variant="both" className="w-4 h-4" />
            {deliveryFilterBothLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={deliveryFilter === 'offline'}
            onClick={() => setDeliveryFilter('offline')}
            className={deliveryFilterButtonClass(deliveryFilter === 'offline')}
          >
            <DeliveryTypeIcon variant="offline" className="w-4 h-4" />
            {deliveryFilterOfflineLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={deliveryFilter === 'online'}
            onClick={() => setDeliveryFilter('online')}
            className={deliveryFilterButtonClass(deliveryFilter === 'online')}
          >
            <DeliveryTypeIcon variant="online" className="w-4 h-4" />
            {deliveryFilterOnlineLabel}
          </button>
        </div>
      )}

      {/* City tabs */}
      {showLocationTabs && (
        <div
          className={`mb-6 ${sessionFilterScrollClass}`}
          role="tablist"
          aria-label="Locaties"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCity === ALL_LOCATIONS}
            onClick={() => handleLocationChange(ALL_LOCATIONS)}
            className={`shrink-0 px-4 py-2 rounded-none text-sm font-medium transition-colors ${activeCity === ALL_LOCATIONS ? 'bg-va-yellow text-va-black' : 'border border-va-lightgray text-va-gray hover:bg-va-lightgray'}`}
          >
            {allLocationsLabel}
          </button>
          {cities.map((city) => (
            <button
              type="button"
              role="tab"
              key={city}
              aria-selected={activeCity === city}
              onClick={() => handleLocationChange(city)}
              className={`shrink-0 px-4 py-2 rounded-none text-sm font-medium transition-colors ${activeCity === city ? 'bg-va-yellow text-va-black' : 'border border-va-lightgray text-va-gray hover:bg-va-lightgray'}`}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-sans text-2xl font-bold text-va-black">{sessionsHeading}</h2>
        {canSort && (
          <div className="flex items-center gap-2">
            <label htmlFor="sessions-sort" className="text-sm text-va-gray">
              {sortLabel}
            </label>
            <select
              id="sessions-sort"
              value={sortField}
              onChange={handleSortDropdownChange}
              className="text-sm border border-va-lightgray px-3 py-2 text-va-black bg-white focus:outline-none focus:ring-2 focus:ring-va-yellow"
            >
              <option value="date">{sortDateLabel}</option>
              <option value="location">{sortLocationLabel}</option>
            </select>
          </div>
        )}
      </div>

      {sortedVariants.length === 0 ? (
        <p className="text-va-gray">{noSessionsMessage}</p>
      ) : (
        <>
          {/* Mobile: stacked session cards */}
          <ul className="divide-y divide-va-black border-t border-va-black md:hidden">
            {sortedVariants.map((variant) => {
              const ei = variant.event_item
              const isOnline = isOnlineVariant(variant)
              const qty = ei?.available_quantity ?? 0
              const isSoldOut = qty === 0
              const isFreeTrial = ei?.is_free_trial ?? false
              const availability = sessionTableAvailabilityPresentation(qty, threshold)
              const price = minVariantPriceCents(variant)
              const city = sessionCityLabel(ei, isOnline)
              const venue = sessionVenueLine(ei, isOnline)
              const instructor = sessionInstructorLabel(ei, profiles, event.featured_instructor)

              return (
                <li key={variant.id} className="py-6 first:pt-6">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="flex items-center gap-1.5 font-semibold text-va-black">
                        <DeliveryTypeIcon variant={isOnline ? 'online' : 'offline'} />
                        {city}
                      </p>
                      {venue ? <p className="text-va-gray leading-snug pl-5">{venue}</p> : null}
                      {(showDate && ei?.start_at) || ei?.start_at ? (
                        <div className="flex min-w-0 flex-col gap-0.5 text-va-black">
                          {showDate && ei?.start_at ? (
                            <>
                              <span>{formatDateWeekdayLong(ei.start_at)}</span>
                              <span className="text-va-gray">
                                {formatTimeRange(ei.start_at, ei.end_at, { separator: ' tot ' })}
                              </span>
                            </>
                          ) : (
                            <span className="text-va-gray">
                              {formatTimeRange(ei.start_at!, ei.end_at, { separator: ' tot ' })}
                            </span>
                          )}
                        </div>
                      ) : null}
                      {instructor ? (
                        <SessionInstructorName
                          eventItem={ei}
                          instructors={profiles}
                          featured={event.featured_instructor}
                          className="text-va-gray"
                        />
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {price ? (
                        <p className="font-medium text-va-black">{formatPriceEur(price)}</p>
                      ) : null}
                      <span className={availability.className}>{availability.label}</span>
                      {renderSessionCta(variant, {
                        className: sessionCtaMobileClassName,
                        isSoldOut,
                        isFreeTrial,
                      })}
                    </div>
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
                  <th className="text-left py-3 pr-4 font-medium">{t.tableAvailability}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedVariants.map((variant) => {
                  const ei = variant.event_item
                  const isOnline = isOnlineVariant(variant)
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
                      <td className="py-4 pr-4 align-middle">
                        <div className="flex items-start gap-1.5">
                          <DeliveryTypeIcon
                            variant={isOnline ? 'online' : 'offline'}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-va-black">{sessionCityLabel(ei, isOnline)}</div>
                            {sessionVenueLine(ei, isOnline) ? (
                              <div className="text-xs mt-0.5 text-va-gray">
                                {sessionVenueLine(ei, isOnline)}
                              </div>
                            ) : null}
                          </div>
                        </div>
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
                        <SessionInstructorName
                          eventItem={ei}
                          instructors={profiles}
                          featured={event.featured_instructor}
                        />
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

        </>
      )}
    </section>
  )
}
