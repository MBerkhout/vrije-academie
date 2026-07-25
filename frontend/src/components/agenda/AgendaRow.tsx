import Link from 'next/link'
import { DeliveryTypeIcon } from '@/components/ui/DeliveryTypeIcon'
import { plpProductPath } from '@/lib/routes'
import type { AgendaItem } from '@/lib/commerce/types'
import {
  presentationForAvailabilityStatus,
  shouldShowOnlineDeliveryIcon,
} from '@/lib/event-status-presentation'
import { cn } from '@/lib/utils'

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
  const status = presentationForAvailabilityStatus(item.status, { city: item.city })
  const statusClassName = status.className
    .split(' ')
    .filter((c) => !c.startsWith('hover:'))
    .join(' ')

  return (
    <article className="group relative grid grid-cols-[76px_1fr_auto_auto] items-stretch gap-0 bg-white border border-va-lightgray rounded-lg overflow-hidden hover:border-va-gray hover:shadow-md transition-[box-shadow,border-color]">
      <Link
        href={href}
        className="absolute inset-0 z-10 rounded-lg"
        aria-label={item.product_title}
      />

      {/* Date cell */}
      <div className="bg-va-lightgray/50 flex flex-col items-center justify-center py-3 px-2 text-center">
        <div className="font-bold text-va-black text-sm leading-none">
          {dayNum} {monthLabel}
        </div>
        {timeRange ? (
          <div className="mt-1 text-xs text-va-black leading-snug sm:hidden">{timeRange}</div>
        ) : null}
        <div className="text-xs text-va-gray mt-1 capitalize">{weekday}</div>
      </div>

      {/* Title + location */}
      <div className="flex flex-col justify-center px-4 py-3 min-w-0">
        <p className="font-sans font-semibold text-va-black text-sm leading-snug group-hover:underline underline-offset-2 decoration-va-black line-clamp-1">
          {item.product_title}
        </p>
        <div className="flex items-center gap-1 text-xs text-va-gray mt-0.5">
          <DeliveryTypeIcon isOnline={isOnline} />
          <span className="truncate">{locationLabel}</span>
        </div>
      </div>

      {/* Time */}
      <div className="hidden sm:flex items-center px-4 py-3 text-sm text-va-black whitespace-nowrap">
        {timeRange}
      </div>

      {/* Availability label */}
      <div
        className={cn(
          'flex items-center justify-center px-5 sm:px-8 text-xs font-bold uppercase tracking-wide min-w-[140px]',
          statusClassName,
        )}
      >
        {status.label}
      </div>
    </article>
  )
}
