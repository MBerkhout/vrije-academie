import { DeliveryTypeIcon } from '@/components/ui/DeliveryTypeIcon'
import { ListingAnchorLink } from '@/components/plp/ListingAnchorLink'
import { listingAgendaAnchorId } from '@/lib/listing-return-anchor'
import { plpProductPath } from '@/lib/routes'
import type { AgendaItem } from '@/lib/commerce/types'
import {
  presentationForAvailabilityStatus,
  shouldShowOnlineDeliveryIcon,
} from '@/lib/event-status-presentation'
import { formatPriceEur } from '@/lib/locale-format'
import { cn } from '@/lib/utils'
import { WaitlistTrigger } from '@/components/waitlist/WaitlistTrigger'

interface AgendaRowProps {
  item: AgendaItem
}

const DAYS_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const MONTHS_NL_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AgendaRow({ item }: AgendaRowProps) {
  if (!item.start_at) return null

  const start = new Date(item.start_at)
  const dayNum = start.getDate()
  const monthLabel = MONTHS_NL_SHORT[start.getMonth()]
  const weekday = DAYS_NL[start.getDay()]

  const timeRange =
    item.start_at && item.end_at
      ? `${formatTime(item.start_at)} tot ${formatTime(item.end_at)}`
      : item.start_at
      ? formatTime(item.start_at)
      : ''

  const locationLabel = item.delivery_type === 'online' ? 'Online' : item.city ?? 'Op locatie'
  const isOnline = shouldShowOnlineDeliveryIcon({
    locationLabel,
    deliveryType: item.delivery_type,
  })

  const href = plpProductPath(item.product_handle)
  const anchorId = listingAgendaAnchorId(item.id, item.variant_id)
  const status = presentationForAvailabilityStatus(item.status, { city: item.city })
  const statusClassName = status.className
    .split(' ')
    .filter((c) => !c.startsWith('hover:'))
    .join(' ')
  const priceLabel = item.price ? formatPriceEur(item.price) : null
  const isSoldOut = item.status === 'sold_out'

  const statusButtonClassName = cn(
    'relative z-20 flex items-center justify-center px-4 py-3 text-xs font-bold uppercase tracking-wide',
    'sm:px-4 sm:py-0 sm:min-w-[7.5rem]',
    'xl:px-5 xl:pl-10 xl:pr-8 xl:min-w-[140px]',
    statusClassName,
  )

  return (
    <article
      id={anchorId}
      className={cn(
        'group relative scroll-mt-32 flex flex-col bg-white border border-va-lightgray rounded-lg overflow-hidden transition-[box-shadow,border-color,opacity]',
        'sm:grid sm:grid-cols-[76px_minmax(0,1fr)_auto_auto] sm:items-stretch sm:gap-0',
        isSoldOut
          ? 'opacity-70 hover:border-va-lightgray'
          : 'hover:border-va-gray hover:shadow-md',
      )}
    >
      <ListingAnchorLink
        href={href}
        anchorId={anchorId}
        className="absolute inset-0 z-10 rounded-lg"
        aria-label={item.product_title}
      />

      {/* Date / time — full-width header on mobile, left cell from sm */}
      <div
        className={cn(
          'flex items-baseline justify-between gap-3 px-4 py-2.5',
          'sm:flex-col sm:items-center sm:justify-center sm:text-center sm:py-3 sm:px-2 sm:gap-0',
          isSoldOut ? 'bg-va-lightgray/80' : 'bg-va-lightgray/50',
        )}
      >
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:flex-col sm:items-center sm:gap-0">
          <div
            className={cn(
              'font-bold text-sm leading-none',
              isSoldOut ? 'text-va-gray' : 'text-va-black',
            )}
          >
            {dayNum} {monthLabel}
          </div>
          <div className="text-xs text-va-gray capitalize sm:mt-1">{weekday}</div>
          {timeRange ? (
            <div
              className={cn(
                'text-xs leading-snug sm:hidden',
                isSoldOut ? 'text-va-gray' : 'text-va-black',
              )}
            >
              {timeRange}
            </div>
          ) : null}
        </div>
        {priceLabel ? (
          <p
            className={cn(
              'shrink-0 text-xs font-semibold tabular-nums sm:hidden',
              isSoldOut ? 'text-va-gray' : 'text-va-black',
            )}
          >
            {priceLabel}
          </p>
        ) : null}
      </div>

      {/* Title + location */}
      <div className="flex flex-col justify-center px-4 py-2 min-w-0 sm:py-3">
        <p
          className={cn(
            'font-sans font-semibold text-sm leading-snug',
            isSoldOut
              ? 'text-va-gray'
              : 'text-va-black group-hover:underline underline-offset-2 decoration-va-black',
          )}
        >
          {item.product_title}
        </p>
        <div className="flex items-center gap-1 text-xs text-va-gray mt-0.5">
          <DeliveryTypeIcon isOnline={isOnline} />
          <span className="truncate">{locationLabel}</span>
        </div>
      </div>

      {/* Time + price — stacked below xl so the title keeps width; pair from xl */}
      <div
        className={cn(
          'hidden sm:flex flex-col items-end justify-center gap-0.5 py-3 pr-4 text-sm whitespace-nowrap',
          'xl:flex-row xl:items-center xl:pr-8',
          isSoldOut ? 'text-va-gray' : 'text-va-black',
        )}
      >
        <div className="tabular-nums xl:w-40 xl:shrink-0 xl:text-right">{timeRange}</div>
        <div className="font-semibold tabular-nums xl:w-24 xl:shrink-0 xl:text-right">
          {priceLabel}
        </div>
      </div>

      {/* Availability label */}
      {isSoldOut ? (
        <WaitlistTrigger
          handle={item.product_handle}
          title={item.product_title}
          variantId={item.variant_id}
          label={status.label}
          className={statusButtonClassName}
        />
      ) : (
        <div className={statusButtonClassName}>{status.label}</div>
      )}
    </article>
  )
}
