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

  return (
    <article
      id={anchorId}
      className={cn(
        'group relative scroll-mt-32 grid grid-cols-[76px_minmax(0,1fr)_auto] sm:grid-cols-[76px_minmax(0,1fr)_auto_auto] items-stretch gap-0 bg-white border border-va-lightgray rounded-lg overflow-hidden transition-[box-shadow,border-color,opacity]',
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

      {/* Date cell */}
      <div
        className={cn(
          'flex flex-col items-center justify-center py-3 px-2 text-center',
          isSoldOut ? 'bg-va-lightgray/80' : 'bg-va-lightgray/50',
        )}
      >
        <div
          className={cn(
            'font-bold text-sm leading-none',
            isSoldOut ? 'text-va-gray' : 'text-va-black',
          )}
        >
          {dayNum} {monthLabel}
        </div>
        {timeRange ? (
          <div
            className={cn(
              'mt-1 text-xs leading-snug sm:hidden',
              isSoldOut ? 'text-va-gray' : 'text-va-black',
            )}
          >
            {timeRange}
          </div>
        ) : null}
        <div className="text-xs text-va-gray mt-1 capitalize">{weekday}</div>
      </div>

      {/* Title + location */}
      <div className="flex flex-col justify-center px-4 py-3 min-w-0">
        <p
          className={cn(
            'font-sans font-semibold text-sm leading-snug line-clamp-1',
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
        {priceLabel ? (
          <p
            className={cn(
              'mt-1 text-xs font-semibold sm:hidden',
              isSoldOut ? 'text-va-gray' : 'text-va-black',
            )}
          >
            {priceLabel}
          </p>
        ) : null}
      </div>

      {/* Time + price — tight pair, extra padding before the CTA */}
      <div
        className={cn(
          'hidden sm:flex items-center py-3 pr-8 text-sm',
          isSoldOut ? 'text-va-gray' : 'text-va-black',
        )}
      >
        <div className="w-40 shrink-0 text-right tabular-nums whitespace-nowrap">{timeRange}</div>
        <div className="w-24 shrink-0 text-right font-semibold tabular-nums whitespace-nowrap">
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
          className={cn(
            'relative z-20 flex items-center justify-center px-5 sm:pl-10 sm:pr-8 text-xs font-bold uppercase tracking-wide min-w-[140px]',
            statusClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center px-5 sm:pl-10 sm:pr-8 text-xs font-bold uppercase tracking-wide min-w-[140px]',
            statusClassName,
          )}
        >
          {status.label}
        </div>
      )}
    </article>
  )
}
