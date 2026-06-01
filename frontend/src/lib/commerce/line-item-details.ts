import type { CartItem } from '@/lib/commerce/types'
import type { GiftCardPurchaseLineMeta } from '@/lib/commerce/gift-card'
import { getGiftCardPurchaseMetaFromLineItem } from '@/lib/commerce/gift-card'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import {
  formatDateShortOrNull,
  formatTimeOrNull,
  formatTimeRange,
} from '@/lib/locale-format'

/**
 * Ordered “secondary” content under a line title (session, docenten, aantal, cadeaubon, notices).
 * To add a new line-item flavor, extend this union and implement it in `buildCartLineItemDetailBlocks` + `CartLineItemDetails`.
 */
export type LineItemDetailBlock =
  | { kind: 'session'; lines: string[] }
  | { kind: 'instructors'; names: string[] }
  | { kind: 'quantity_label'; label: string }
  | { kind: 'gift_recipient'; meta: GiftCardPurchaseLineMeta }
  | { kind: 'notice'; text: string; italic?: boolean }

export type BuildLineItemDetailsOptions = {
  /**
   * Payment/overview: show “Online” when city is empty but delivery is online.
   * Cart row does not use this fallback.
   */
  onlineCityFallback?: boolean
  /** Shown after instructors / before gift (e.g. “2 tickets”, “1 cadeaubon”). Omit in cart rows. */
  quantityLabel?: string
  groupBookingNotice?: string
  /** Show notice when quantity is strictly greater than this (default 12). */
  groupBookingQuantityThreshold?: number
}

function sessionLinesFromExtras(
  extras: CartItemExtras | null,
  options: BuildLineItemDetailsOptions
): string[] {
  const eventItem = extras?.event_item ?? null
  let sessionCity = eventItem?.city?.trim() || null
  if (!sessionCity && options.onlineCityFallback) {
    if (eventItem?.delivery_type?.toLowerCase() === 'online') {
      sessionCity = 'Online'
    }
  }
  const sessionDate = formatDateShortOrNull(eventItem?.start_at)
  const startTime = formatTimeOrNull(eventItem?.start_at)
  const sessionTime =
    startTime && eventItem?.start_at
      ? eventItem.end_at
        ? formatTimeRange(eventItem.start_at, eventItem.end_at, { separator: ' tot ' })
        : startTime
      : null

  const lines = [sessionCity, sessionDate, sessionTime].filter((s): s is string => Boolean(s?.trim()))
  return lines
}

/**
 * Single source of truth for which detail blocks appear for a cart line (cart, checkout overview, order summary).
 */
export function buildCartLineItemDetailBlocks(
  item: CartItem,
  extras: CartItemExtras | null,
  options?: BuildLineItemDetailsOptions
): LineItemDetailBlock[] {
  const ops = options ?? {}
  const blocks: LineItemDetailBlock[] = []

  const sessionLines = sessionLinesFromExtras(extras, ops)
  if (sessionLines.length > 0) {
    blocks.push({ kind: 'session', lines: sessionLines })
  }

  const instructors = extras?.instructor_names ?? []
  if (instructors.length > 0) {
    blocks.push({ kind: 'instructors', names: instructors })
  }

  if (ops.quantityLabel?.trim()) {
    blocks.push({ kind: 'quantity_label', label: ops.quantityLabel.trim() })
  }

  const giftMeta = getGiftCardPurchaseMetaFromLineItem(item)
  if (giftMeta) {
    blocks.push({ kind: 'gift_recipient', meta: giftMeta })
  }

  const threshold = ops.groupBookingQuantityThreshold ?? 12
  if (item.quantity > threshold && ops.groupBookingNotice?.trim()) {
    blocks.push({ kind: 'notice', text: ops.groupBookingNotice.trim(), italic: true })
  }
  return blocks
}