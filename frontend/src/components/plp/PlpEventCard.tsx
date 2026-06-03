import Image from 'next/image'
import Link from 'next/link'
import type { PlpFilterState } from '@/app/(main)/ons-aanbod/_state/url'
import { plpFilterHrefWithProductType } from '@/app/(main)/ons-aanbod/_state/redirects'
import { plpProductPath } from '@/lib/routes'
import type { EventCard } from '@/lib/commerce/types'
import { DeliveryTypeIcon } from '@/components/ui/DeliveryTypeIcon'
import {
  classNameForPlpProductTypeBadge,
  classNameForProductBadge,
  plpEventLocationLabel,
  plpListingStockPresentation,
  plpProductTypeBadgeLabel,
  shouldShowEventDates,
  shouldShowOnlineDeliveryIcon,
} from '@/lib/event-status-presentation'
import { productTypeToSlug } from '@/lib/plp-product-types'
import { formatDateShort, formatPriceEur } from '@/lib/locale-format'
import { cn } from '@/lib/utils'

interface PlpEventCardProps {
  event: EventCard
  stockThreshold: number
  /** PDP: square corners (no border radius) */
  squareCorners?: boolean
  /** When set, record-type badges link to a filtered PLP preserving these filters. */
  filterState?: PlpFilterState
}

export function PlpEventCard({
  event,
  stockThreshold,
  squareCorners = false,
  filterState,
}: PlpEventCardProps) {
  const href = plpProductPath(event.handle)
  const locationLabel = plpEventLocationLabel(event)
  const isOnline = shouldShowOnlineDeliveryIcon({
    locationLabel,
    deliveryTypes: event.delivery_types,
  })
  const showDate = shouldShowEventDates(event)

  const statusBadgeClassName = classNameForProductBadge(event.badge)
  const recordTypeBadge = plpProductTypeBadgeLabel(event.product_type)
  const recordTypeSlug = productTypeToSlug(event.product_type)
  const recordTypeBadgeClass = classNameForPlpProductTypeBadge(event.product_type)
  const imageBadgeLabel = recordTypeBadge ?? event.badge
  const imageBadgeClassName = recordTypeBadgeClass ?? statusBadgeClassName
  const recordTypeBadgeHref =
    recordTypeSlug != null ? plpFilterHrefWithProductType(filterState, recordTypeSlug) : null

  const { soldOut } = plpListingStockPresentation(
    event.min_available_quantity,
    stockThreshold
  )

  const priceFrom = event.price_from

  const badgeClasses = cn(
    'absolute top-2 left-2 text-xs font-bold px-2 py-0.5 z-10',
    squareCorners ? 'rounded-none' : 'rounded',
    imageBadgeClassName,
    recordTypeBadgeHref && 'hover:opacity-90 transition-opacity',
  )

  return (
    <article
      className={cn(
        'relative group border border-va-lightgray overflow-hidden flex flex-col bg-white hover:shadow-md transition-shadow',
        soldOut && 'opacity-70',
      )}
    >
      <div className="relative aspect-[4/3] bg-va-lightgray overflow-hidden">
        {event.thumbnail ? (
          <Image
            src={event.thumbnail}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-va-lightgray">
            <img
              src="/branding/logo.svg"
              alt=""
              width={233}
              height={167}
              className="h-12 w-auto brightness-0 opacity-40"
            />
          </div>
        )}
        {imageBadgeLabel &&
          (recordTypeBadgeHref ? (
            <Link href={recordTypeBadgeHref} className={badgeClasses}>
              {imageBadgeLabel}
            </Link>
          ) : (
            <span className={badgeClasses}>{imageBadgeLabel}</span>
          ))}
      </div>

      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="font-serif font-bold text-va-black text-sm leading-snug line-clamp-3 md:text-base md:line-clamp-2">
          <Link
            href={href}
            className="transition-colors hover:text-va-yellow group-hover:text-va-yellow after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </Link>
        </h3>

        {(locationLabel || (showDate && event.earliest_start_at)) && (
          <div className="flex items-center gap-3 text-xs text-va-gray">
            {locationLabel && (
              <span className="flex items-center gap-1">
                <DeliveryTypeIcon isOnline={isOnline} />
                {locationLabel}
              </span>
            )}
            {showDate && event.earliest_start_at && (
              <span>{formatDateShort(event.earliest_start_at)}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            {priceFrom ? (
              <span className="text-sm font-semibold text-va-black">
                Vanaf {formatPriceEur(priceFrom)}
              </span>
            ) : null}
            {soldOut && (
              <span className="text-xs text-va-gray">Uitverkocht</span>
            )}
          </div>
          <span className="text-xs md:text-sm font-medium text-va-black flex items-center gap-1 group-hover:text-va-yellow transition-colors shrink-0">
            <span className="md:hidden">Bekijk →</span>
            <span className="hidden md:inline">Bekijk meer →</span>
          </span>
        </div>
      </div>
    </article>
  )
}
