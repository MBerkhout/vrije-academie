import { isGiftCardPurchaseLineItem } from './gift-card'
import type { Cart, CartItem } from './types'
import { vatPercentFromCartLike } from './vat'

/**
 * Medusa v2 store cart/order APIs return catalog prices in major EUR (e.g. 18 = €18).
 * Custom store routes and formatPriceEur expect integer cents (e.g. 1800).
 * Gift card purchase lines pass amount in cents as unit_price; Medusa returns that scalar unchanged.
 */

export function parseMoney(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (v && typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>
    if (typeof o.numeric_ === 'number') return o.numeric_
    if (typeof o.amount === 'number') return o.amount
  }
  return 0
}

export function medusaMajorToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

export function lineUnitToStorefrontCents(raw: unknown, isGiftcard?: boolean): number {
  const amount = parseMoney(raw)
  if (isGiftcard) return amount
  return medusaMajorToCents(amount)
}

export function cartAggregateToStorefrontCents(raw: unknown): number {
  return medusaMajorToCents(parseMoney(raw))
}

function isGiftcardCartLine(o: Record<string, unknown>): boolean {
  return isGiftCardPurchaseLineItem({
    is_giftcard: o.is_giftcard as boolean | undefined,
    metadata: o.metadata as Record<string, unknown> | null | undefined,
  })
}

function mapStoreCartItem(raw: unknown): CartItem {
  const o = raw as Record<string, unknown>
  const isGiftcard = isGiftcardCartLine(o)
  const unit_price = lineUnitToStorefrontCents(o.unit_price, isGiftcard)
  const quantity = typeof o.quantity === 'number' ? o.quantity : Number(o.quantity ?? 1)
  const rawLineTotal = parseMoney(o.total)
  const total =
    rawLineTotal > 0
      ? isGiftcard
        ? rawLineTotal
        : medusaMajorToCents(rawLineTotal)
      : unit_price * quantity
  const rawSubtotal = parseMoney(o.subtotal)
  const subtotal =
    rawSubtotal > 0 ? (isGiftcard ? rawSubtotal : medusaMajorToCents(rawSubtotal)) : unit_price * quantity

  return {
    ...(o as unknown as CartItem),
    quantity,
    unit_price,
    subtotal,
    total,
    is_giftcard: isGiftcard || undefined,
  }
}

function lineItemsSubtotalCents(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.total ?? item.unit_price * item.quantity), 0)
}

export function normalizeStoreCart(raw: unknown): Cart {
  const o = raw as Record<string, unknown>
  const items = (Array.isArray(o.items) ? o.items : []).map(mapStoreCartItem)
  const hasGiftcardLine = items.some((i) => i.is_giftcard)
  const onlyGiftcardLines = items.length > 0 && items.every((i) => i.is_giftcard)
  const hasCatalogLine = items.some((i) => !i.is_giftcard)

  let subtotal: number
  let discount_total: number
  let tax_total: number
  let total: number
  let credit_line_total: number | undefined

  if (onlyGiftcardLines) {
    subtotal = parseMoney(o.subtotal)
    discount_total = parseMoney(o.discount_total)
    tax_total = parseMoney(o.tax_total)
    total = parseMoney(o.total)
    credit_line_total =
      o.credit_line_total !== undefined ? parseMoney(o.credit_line_total) : undefined
  } else if (hasGiftcardLine && hasCatalogLine) {
    subtotal = lineItemsSubtotalCents(items)
    discount_total = cartAggregateToStorefrontCents(o.discount_total)
    tax_total = cartAggregateToStorefrontCents(o.tax_total)
    total = cartAggregateToStorefrontCents(o.total)
    credit_line_total =
      o.credit_line_total !== undefined
        ? cartAggregateToStorefrontCents(o.credit_line_total)
        : undefined
  } else {
    subtotal = cartAggregateToStorefrontCents(o.subtotal)
    discount_total = cartAggregateToStorefrontCents(o.discount_total)
    tax_total = cartAggregateToStorefrontCents(o.tax_total)
    total = cartAggregateToStorefrontCents(o.total)
    credit_line_total =
      o.credit_line_total !== undefined
        ? cartAggregateToStorefrontCents(o.credit_line_total)
        : undefined
  }

  const tax_rate = vatPercentFromCartLike({
    items: o.items as unknown[] | undefined,
    shipping_address: o.shipping_address as Cart['shipping_address'],
    billing_address: o.billing_address as Cart['billing_address'],
    tax_rate: typeof o.tax_rate === 'number' ? o.tax_rate : undefined,
  })

  return {
    ...(o as unknown as Cart),
    items,
    subtotal,
    discount_total,
    tax_total,
    tax_rate,
    total,
    credit_line_total,
    completed_at: (o.completed_at as string | null | undefined) ?? null,
  }
}
