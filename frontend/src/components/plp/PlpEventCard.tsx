import Image from 'next/image'
import Link from 'next/link'
import { plpProductPath } from '@/lib/routes'
import { SelectItemLink } from '@/components/analytics/SelectItemLink'
import type { EventCard } from '@/lib/commerce/types'
import { DeliveryTypeIcon } from '@/components/ui/DeliveryTypeIcon'
import {
  plpEventDeliveryTypeDisplay,
  plpEventHasMultipleDates,
  plpListingStockPresentation,
  eventPricePrefixLabel,
  shouldShowEventDates,
} from '@/lib/event-status-presentation'
import { defaultMessages } from '@/lib/i18n/messages'
import { formatDateShort, formatPriceEur } from '@/lib/locale-format'
import { cn } from '@/lib/utils'
import { PlpEventCardWishlistButton } from './PlpEventCardWishlistButton'
import { ProductCardCtaBar } from './ProductCardCtaBar'

interface PlpEventCardProps {
  event: EventCard
  stockThreshold: number
  className?: string
  /** Stretch card + reserve space for variable meta/title (carousel rows). */
  equalizeHeight?: boolean
  index?: number
}

export function PlpEventCard({
  event,
  stockThreshold,
  className,
  equalizeHeight = false,
  index,
}: PlpEventCardProps) {
  const href = plpProductPath(event.handle)
  const deliveryType = plpEventDeliveryTypeDisplay(event)
  const showDate = shouldShowEventDates(event)
  const multipleDates = plpEventHasMultipleDates(event)

  const { soldOut } = plpListingStockPresentation(event, stockThreshold)

  const priceFrom = event.price_from
  const pricePrefix = eventPricePrefixLabel(event, {
    from: defaultMessages.plp.cardPriceFrom,
    for: defaultMessages.plp.cardPriceFor,
  })

  return (
    <article
      className={cn(
        'relative group rounded-lg border border-va-lightgray overflow-hidden flex flex-col bg-white hover:shadow-md transition-shadow',
        equalizeHeight && 'h-full',
        soldOut && 'opacity-70',
        className,
      )}
    >
      <div className="relative aspect-[4/3] rounded-t-lg bg-va-lightgray overflow-hidden">
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
        <PlpEventCardWishlistButton handle={event.handle} />
      </div>

      <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
        <h3
          className={cn(
            'flex items-start gap-1.5 font-sans font-bold text-va-black text-sm leading-snug md:text-base',
            equalizeHeight && 'min-h-[3.75rem] md:min-h-[2.5rem]',
          )}
        >
          <SelectItemLink
            event={event}
            index={index}
            href={href}
            className="line-clamp-3 md:line-clamp-2 min-w-0 flex-1 group-hover:underline underline-offset-2 after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </SelectItemLink>
          {deliveryType ? (
            <DeliveryTypeIcon variant={deliveryType} className="mt-0.5" />
          ) : null}
        </h3>

        {showDate && event.earliest_start_at ? (
          <div className={cn('text-xs text-va-gray', equalizeHeight && 'min-h-[1.25rem]')}>
            {multipleDates ? 'Vanaf ' : ''}
            {formatDateShort(event.earliest_start_at)}
          </div>
        ) : equalizeHeight ? (
          <div className="min-h-[1.25rem]" aria-hidden />
        ) : null}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            {priceFrom ? (
              <span className="text-sm font-semibold text-va-black">
                {pricePrefix} {formatPriceEur(priceFrom)}
              </span>
            ) : null}
            {soldOut && (
              <span className="text-xs text-va-gray">Uitverkocht</span>
            )}
          </div>
          <span className="text-xs md:text-sm font-medium text-va-black flex items-center gap-1 group-hover:underline underline-offset-2 shrink-0">
            <span className="md:hidden">Bekijk →</span>
            <span className="hidden md:inline">Bekijk meer →</span>
          </span>
        </div>
      </div>

      <ProductCardCtaBar event={event} />
    </article>
  )
}
