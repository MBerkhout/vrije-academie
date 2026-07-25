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
 * - PLP card delivery icon + date visibility (`plpEventDeliveryTypeDisplay`, `shouldShowEventDates`, `plpEventHasMultipleDates`)
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

export interface PlpEventLocationLine {
  label: string
  isOnline: boolean
}

export type PlpEventDeliveryTypeDisplay = 'offline' | 'online' | 'both'

/** Compact delivery icon next to PLP card titles: pin, camera, or pin / camera. */
export function plpEventDeliveryTypeDisplay(
  event: EventCardLocationInput,
): PlpEventDeliveryTypeDisplay | null {
  const hasOnsite = event.delivery_types?.includes('offline')
  const hasOnline = event.delivery_types?.includes('online')

  if (hasOnsite && hasOnline) return 'both'
  if (isOnlineOnlyEvent(event)) return 'online'
  if (hasOnsite || (event.cities?.length ?? 0) > 0) return 'offline'
  return null
}

/** Location lines on PLP tiles and similar product cards. Hybrid products return two lines. */
export function plpEventLocationLines(event: EventCardLocationInput): PlpEventLocationLine[] {
  const isOnlineOnly = isOnlineOnlyEvent(event)
  const hasOnsite = event.delivery_types?.includes('offline')
  const hasOnline = event.delivery_types?.includes('online')

  if (isOnlineOnly) return [{ label: 'Online', isOnline: true }]
  if (hasOnsite && hasOnline) {
    return [
      { label: 'Op locatie', isOnline: false },
      { label: 'Online', isOnline: true },
    ]
  }

  const cities = event.cities ?? []
  if (cities.length > 1) return [{ label: 'Op locatie', isOnline: false }]
  if (cities.length === 1) return [{ label: cities[0], isOnline: false }]
  if (hasOnsite) return [{ label: 'Op locatie', isOnline: false }]
  return []
}

/** @deprecated Use `plpEventLocationLines` for PLP cards. Kept for single-line consumers. */
export function plpEventLocationLabel(event: EventCardLocationInput): string {
  const lines = plpEventLocationLines(event)
  if (lines.length === 2) return 'Op locatie + online'
  return lines[0]?.label ?? ''
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

/** True when a PLP card should prefix the date with "Vanaf" (multiple future on-site session dates). */
export function plpEventHasMultipleDates({ delivery_types, variants }: EventDateInput): boolean {
  if (!shouldShowEventDates({ delivery_types, variants })) return false

  const dates = new Set<string>()
  for (const v of variants ?? []) {
    const ei = v.event_item
    if (!ei || ei.delivery_type !== 'offline') continue
    if (!isFutureEventVariant(v)) continue
    const start = ei.start_at
    if (!start) continue
    dates.add(start.slice(0, 10))
  }
  return dates.size > 1
}

/** Lowest positive variant price in cents (store API / Sanity mirror scale). */
export function minVariantPriceCents(variant: Pick<EventVariant, 'prices'>): number | null {
  const amounts = (variant.prices ?? [])
    .map((p) => p.amount)
    .filter((n): n is number => Number.isFinite(n) && n > 0)
  return amounts.length ? Math.min(...amounts) : null
}

function pricingVariantsForEvent(
  event: Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id'>,
): EventVariant[] {
  const variants = event.variants ?? []
  if (event.purchase_mode === 'bundle_only' && event.bundle_variant_id) {
    const bundle = variants.find((v) => v.id === event.bundle_variant_id)
    return bundle ? [bundle] : variants.filter((v) => v.purchasable !== false)
  }
  return variants.filter((v) => v.purchasable !== false)
}

/** VA Thuis on-demand bundles are always available for purchase. */
export function eventHasUnlimitedAvailability(
  event: Pick<EventCard, 'purchase_mode' | 'record_type'>,
): boolean {
  return event.purchase_mode === 'bundle_only' || event.record_type === 'vathuis'
}

function variantAvailableQuantity(variant: EventVariant): number {
  return variant.event_item?.available_quantity ?? 0
}

/** Future, purchasable sessions that count toward product-level availability. */
export function bookableEventVariants(
  event: Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id'>,
): EventVariant[] {
  return filterFutureEventVariants(pricingVariantsForEvent(event))
}

/**
 * True when every bookable session is sold out. Unlike `min_available_quantity === 0`,
 * this stays false when only some dates are volgeboekt.
 */
export function eventIsFullySoldOut(
  event: Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id' | 'record_type'>,
): boolean {
  if (eventHasUnlimitedAvailability(event)) return false
  const variants = bookableEventVariants(event)
  if (variants.length === 0) return false
  return variants.every((variant) => variantAvailableQuantity(variant) === 0)
}

/** Lowest spot count among sessions that still have availability; null when none remain. */
export function minPositiveBookableQuantity(
  event: Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id' | 'record_type'>,
): number | null {
  if (eventHasUnlimitedAvailability(event)) return null
  const quantities = bookableEventVariants(event)
    .map(variantAvailableQuantity)
    .filter((quantity) => quantity > 0)
  return quantities.length > 0 ? Math.min(...quantities) : null
}

/** Positive per-variant prices (cents) used for “Vanaf” vs “Voor” on cards and PDP. */
export function positiveVariantPricesCents(
  event: Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id'>,
): number[] {
  return pricingVariantsForEvent(event)
    .map(minVariantPriceCents)
    .filter((p): p is number => p != null)
}

/** True when every priced variant shares the same amount (or there is at most one price). */
export function eventHasUniformPrice(
  event: Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id' | 'price_from'>,
): boolean {
  const prices = positiveVariantPricesCents(event)
  if (prices.length <= 1) return true
  return Math.min(...prices) === Math.max(...prices)
}

export interface EventPricePrefixOptions {
  from?: string
  for?: string
}

/**
 * Price label before the amount: “Voor” when all sessions share one price, “Vanaf” when they differ.
 * Returns `null` for bundle-only products (no prefix in the booking panel).
 */
export function eventPricePrefixLabel(
  event: Pick<EventCard, 'variants' | 'purchase_mode' | 'bundle_variant_id' | 'price_from'>,
  options?: EventPricePrefixOptions,
): string | null {
  if (event.purchase_mode === 'bundle_only') return null

  const from = options?.from ?? defaultMessages.plp.cardPriceFrom
  const forLabel = options?.for ?? defaultMessages.plp.cardPriceFor

  return eventHasUniformPrice(event) ? forLabel : from
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

/** Product-level stock on listing grids (PLP, related, similar). */
export function plpListingStockPresentation(
  event: Pick<
    EventCard,
    'variants' | 'purchase_mode' | 'bundle_variant_id' | 'min_available_quantity' | 'record_type'
  >,
  lowStockThreshold: number
): { soldOut: boolean; lowStock: { label: string } | null } {
  if (eventHasUnlimitedAvailability(event)) {
    return { soldOut: false, lowStock: null }
  }
  const soldOut = eventIsFullySoldOut(event)
  const n = soldOut ? null : (minPositiveBookableQuantity(event) ?? event.min_available_quantity)
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
