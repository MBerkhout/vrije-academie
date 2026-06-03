import type { AgendaItem, EventCard, EventVariant } from '@/lib/commerce/types'
import {
  plpProductTypeBadgeClass,
  plpProductTypeBadgeLabel,
  productTypeToSlug,
} from '@/lib/plp-product-types'
import { defaultMessages, interpolate } from '@/lib/i18n'

/**
 * Central place for **event / product availability and badge** presentation:
 * - Agenda row CTA labels + Tailwind classes (`presentationForAvailabilityStatus`)
 * - PLP / card image badge styles from free-text CMS values (`classNameForProductBadge`)
 * - PLP tile low-stock footnote vs sold-out (`plpListingStockPresentation`)
 * - PDP session table availability cell (`sessionTableAvailabilityPresentation`)
 * - PLP card location + date visibility (`plpEventLocationLabel`, `shouldShowEventDates`)
 *
 * Add new keyword → style mappings for product badges here; keep order in
 * `PRODUCT_BADGE_RULES` meaningful (first matching rule wins).
 */

type EventCardLocationInput = Pick<EventCard, 'delivery_types' | 'cities'>

/** True when a product is offered online only (no on-site sessions). */
export function isOnlineOnlyEvent(event: Pick<EventCard, 'delivery_types'>): boolean {
  return event.delivery_types?.length === 1 && event.delivery_types[0] === 'online'
}

/** Whether the location line represents an online session (camera icon). */
export function shouldShowOnlineDeliveryIcon(input: {
  locationLabel?: string | null
  deliveryType?: string | null
  deliveryTypes?: string[] | null
}): boolean {
  if (input.deliveryType === 'online') return true
  if (isOnlineOnlyEvent({ delivery_types: input.deliveryTypes ?? undefined })) return true
  return input.locationLabel?.trim().toLowerCase() === 'online'
}

/** Location line on PLP tiles and similar product cards. */
export function plpEventLocationLabel(event: EventCardLocationInput): string {
  const isOnlineOnly = isOnlineOnlyEvent(event)
  const hasOnsite = event.delivery_types?.includes('offline')
  const hasOnline = event.delivery_types?.includes('online')

  if (isOnlineOnly) return 'Online'
  if (hasOnsite && hasOnline) return 'Op locatie + online'

  const cities = event.cities ?? []
  if (cities.length > 1) return 'Op locatie'
  if (cities.length === 1) return cities[0]
  if (hasOnsite) return 'Op locatie'
  return ''
}

/** Session variant is shown when start_at is absent (on-demand) or in the future. */
export function isFutureEventVariant(v: Pick<EventVariant, 'event_item'>): boolean {
  const ei = v.event_item
  if (!ei) return true
  const start = ei.start_at
  if (!start) return true
  return new Date(start).getTime() >= Date.now()
}

export function filterFutureEventVariants(variants: EventVariant[]): EventVariant[] {
  return variants.filter(isFutureEventVariant)
}

type EventDateInput = Pick<EventCard, 'delivery_types' | 'variants'>

/**
 * Whether to show session dates on PLP cards and PDP session tables.
 * Hidden for online-only products, and for hybrid products whose on-site
 * sessions are all in the past (only online remains).
 */
export function shouldShowEventDates({ delivery_types, variants }: EventDateInput): boolean {
  const types = delivery_types ?? []

  if (types.length === 1 && types[0] === 'online') return false

  const hasOnline = types.includes('online')
  const hasOffline = types.includes('offline')
  if (hasOnline && hasOffline) {
    const now = Date.now()
    const offlineSessions = (variants ?? []).filter(
      (v: EventVariant) => v.event_item?.delivery_type === 'offline',
    )
    if (
      offlineSessions.length > 0 &&
      offlineSessions.every((v) => {
        const start = v.event_item?.start_at
        if (!start) return true
        return new Date(start).getTime() < now
      })
    ) {
      return false
    }
  }

  return true
}

export type EventAvailabilityStatus = AgendaItem['status']

/** Keyword substrings (lowercase) → badge container classes. First match wins. */
const PRODUCT_BADGE_RULES: readonly { keyword: string; className: string }[] = [
  { keyword: 'uitverkocht', className: 'bg-va-gray text-white' },
  { keyword: 'on demand', className: 'bg-va-yellow text-va-black' },
  { keyword: 'exclusief', className: 'bg-va-purple text-white' },
  { keyword: 'nieuw', className: 'bg-va-orange text-white' },
]

export const DEFAULT_PRODUCT_BADGE_CLASS = 'bg-va-gray text-white'

export { plpProductTypeBadgeLabel }

/** Tailwind classes for a PLP record-type badge (Reis, Studiedag, …). */
export function classNameForPlpProductTypeBadge(
  productType: string | null | undefined
): string | null {
  const slug = productTypeToSlug(productType)
  if (!slug) return null
  return plpProductTypeBadgeClass(slug)
}

/**
 * Tailwind classes for the product image overlay badge (PLP cards, etc.).
 * Badge **text** stays the CMS value; only styling is derived here.
 */
export function classNameForProductBadge(badge: string | null | undefined): string {
  if (!badge?.trim()) return DEFAULT_PRODUCT_BADGE_CLASS
  const lower = badge.toLowerCase()
  for (const { keyword, className } of PRODUCT_BADGE_RULES) {
    if (lower.includes(keyword)) return className
  }
  return DEFAULT_PRODUCT_BADGE_CLASS
}

/** From this many free spots onward, the PDP session table shows "Beschikbaar" instead of a count. */
export const SESSION_AVAILABILITY_GENERIC_THRESHOLD = 10

export interface SessionTableAvailabilityPresentation {
  label: string
  className: string
}

/** Availability cell on the PDP session table (`PdpLocationTabs`). */
export function sessionTableAvailabilityPresentation(
  availableQuantity: number,
  lowStockThreshold: number,
): SessionTableAvailabilityPresentation {
  const t = defaultMessages.pdp

  if (availableQuantity === 0) {
    return {
      label: t.bookingSoldOutLabel ?? 'Volgeboekt',
      className: 'text-xs font-medium text-va-gray bg-va-lightgray px-2 py-0.5 rounded-none',
    }
  }

  if (availableQuantity <= lowStockThreshold) {
    return {
      label:
        availableQuantity === 1
          ? interpolate(defaultMessages.plp.stockLowOne, { count: availableQuantity })
          : interpolate(defaultMessages.plp.stockLowMany, { count: availableQuantity }),
      className: 'text-xs font-medium text-va-orange',
    }
  }

  if (availableQuantity >= SESSION_AVAILABILITY_GENERIC_THRESHOLD) {
    return {
      label: t.tableAvailabilityAvailable ?? 'Beschikbaar',
      className: 'text-xs font-medium text-green-700',
    }
  }

  return {
    label: interpolate(t.tableAvailabilityCount ?? '{count} beschikbaar', {
      count: availableQuantity,
    }),
    className: 'text-xs font-medium text-green-700',
  }
}

/** `EventCard.min_available_quantity` on listing grids (PLP, related, similar). */
export function plpListingStockPresentation(
  minAvailableQuantity: number | null | undefined,
  lowStockThreshold: number
): { soldOut: boolean; lowStock: { label: string } | null } {
  const soldOut = minAvailableQuantity === 0
  const n = minAvailableQuantity
  const showLowStock =
    n !== null && n !== undefined && n <= lowStockThreshold && n > 0
  const lowStock = showLowStock
    ? {
        label:
          n === 1
            ? interpolate(defaultMessages.plp.stockLowOne, { count: n })
            : interpolate(defaultMessages.plp.stockLowMany, { count: n }),
      }
    : null
  return { soldOut, lowStock }
}

export interface AvailabilityPresentation {
  label: string
  /** Tailwind classes for the CTA / status control (includes hover where relevant). */
  className: string
}

/**
 * Label + classes for agenda-style row CTAs and similar controls.
 * Matches backend `status` on `GET /store/agenda` items.
 */
export function presentationForAvailabilityStatus(
  status: EventAvailabilityStatus,
  options?: { city?: string | null }
): AvailabilityPresentation {
  const cityLabel = options?.city?.trim() ?? ''
  const a = defaultMessages.agenda
  switch (status) {
    case 'waitlist':
      return {
        label: a.availabilityWaitlist,
        className: 'bg-va-gray text-white hover:bg-va-darkgray',
      }
    case 'almost_full':
      return {
        label: a.availabilityAlmostFull,
        className: 'bg-red-600 text-white hover:bg-red-700',
      }
    case 'exclusief':
      return {
        label: cityLabel
          ? interpolate(a.availabilityExclusiveInCity, { city: cityLabel })
          : a.availabilityExclusive,
        className: 'bg-va-purple text-white hover:bg-va-purple/90',
      }
    case 'open':
    default:
      return {
        label: a.availabilityOpen,
        className: 'bg-va-yellow text-va-black hover:bg-va-yellow/80',
      }
  }
}
