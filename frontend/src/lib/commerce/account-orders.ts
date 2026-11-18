import type { CheckoutConfirmationItem } from '@/lib/commerce/checkout-confirmation-types'
import type { Order } from '@/lib/commerce/types'

export type AccountOrdersTimeFilter = 'all' | 'upcoming' | 'past'

export type OrderTimeCategory = 'upcoming' | 'past' | 'unscheduled'

export type UpcomingSoonOrderHighlight = {
  orderId: string
  title: string
  startAt: string
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

export function twoDaysFromNowMs(nowMs: number = Date.now()): number {
  return nowMs + TWO_DAYS_MS
}

function sessionStartAt(item: Pick<CheckoutConfirmationItem, 'event_item'>): string | null {
  const start = item.event_item?.start_at
  return start?.trim() ? start : null
}

export function getOrderTimeCategory(
  items: Pick<CheckoutConfirmationItem, 'event_item' | 'is_vathuis' | 'vathuis'>[],
  nowMs: number = Date.now(),
): OrderTimeCategory {
  const starts = items
    .filter((item) => !item.is_vathuis && !item.vathuis)
    .map(sessionStartAt)
    .filter((s): s is string => Boolean(s))
  if (starts.length === 0) return 'unscheduled'
  const hasUpcoming = starts.some((s) => new Date(s).getTime() >= nowMs)
  return hasUpcoming ? 'upcoming' : 'past'
}

export function orderMatchesTimeFilter(
  category: OrderTimeCategory,
  filter: AccountOrdersTimeFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'upcoming') return category === 'upcoming'
  return category === 'past'
}

export function findUpcomingOrderWithinTwoDays(
  rows: Array<{
    order: Order
    items: Pick<CheckoutConfirmationItem, 'title' | 'event_item' | 'is_vathuis' | 'vathuis'>[]
  }>,
  nowMs: number = Date.now(),
): UpcomingSoonOrderHighlight | null {
  const cutoff = twoDaysFromNowMs(nowMs)
  let best: UpcomingSoonOrderHighlight | null = null
  let bestStart = Infinity

  for (const row of rows) {
    for (const item of row.items) {
      if (item.is_vathuis || item.vathuis) continue
      const start = sessionStartAt(item)
      if (!start) continue
      const startMs = new Date(start).getTime()
      if (startMs < nowMs || startMs > cutoff) continue
      if (startMs < bestStart) {
        bestStart = startMs
        best = { orderId: row.order.id, title: item.title, startAt: start }
      }
    }
  }

  return best
}

export function isOrderVisibleInAccount(order: Order): boolean {
  if (order.status === 'canceled') return false
  const metadata = order.metadata
  if (!metadata || typeof metadata !== 'object') return true
  return metadata.hidden_from_account !== true
}
