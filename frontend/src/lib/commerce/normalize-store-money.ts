import { isGiftCardPurchaseLineItem } from './gift-card'
import type { Cart, CartItem } from './types'
import { vatPercentFromCartLike } from './vat'

/**
 * Medusa v2 store cart/order APIs return catalog and gift-card prices in major EUR (e.g. 18 = €18).
 * Custom store routes and formatPriceEur expect integer cents (e.g. 1800).
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

export function lineUnitToStorefrontCents(raw: unknown): number {
  return medusaMajorToCents(parseMoney(raw))
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
  const unit_price = lineUnitToStorefrontCents(o.unit_price)
  const quantity = typeof o.quantity === 'number' ? o.quantity : Number(o.quantity ?? 1)
  const rawLineTotal = parseMoney(o.total)
  const total = rawLineTotal > 0 ? medusaMajorToCents(rawLineTotal) : unit_price * quantity
  const rawSubtotal = parseMoney(o.subtotal)
  const subtotal = rawSubtotal > 0 ? medusaMajorToCents(rawSubtotal) : unit_price * quantity

  return {
    ...(o as unknown as CartItem),
    quantity,
    unit_price,
    subtotal,
    total,
    is_giftcard: isGiftcard || undefined,
  }
}

export function normalizeStoreCart(raw: unknown): Cart {
  const o = raw as Record<string, unknown>
  const items = (Array.isArray(o.items) ? o.items : []).map(mapStoreCartItem)

  const tax_rate = vatPercentFromCartLike({
    items: o.items as unknown[] | undefined,
    tax_rate: typeof o.tax_rate === 'number' ? o.tax_rate : undefined,
  })

  return {
    ...(o as unknown as Cart),
    items,
    subtotal: cartAggregateToStorefrontCents(o.subtotal),
    discount_total: cartAggregateToStorefrontCents(o.discount_total),
    tax_total: cartAggregateToStorefrontCents(o.tax_total),
    tax_rate,
    total: cartAggregateToStorefrontCents(o.total),
    credit_line_total:
      o.credit_line_total !== undefined
        ? cartAggregateToStorefrontCents(o.credit_line_total)
        : undefined,
    completed_at: (o.completed_at as string | null | undefined) ?? null,
  }
}
