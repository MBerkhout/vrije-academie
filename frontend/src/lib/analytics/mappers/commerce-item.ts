import type { AgendaItem, CartItem, EventCard, EventVariant } from '@/lib/commerce/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import {
  getGiftCardPurchaseMetaFromLineItem,
  isGiftCardPurchaseLineItem,
} from '@/lib/commerce/gift-card'
import { formatDateShortOrNull, formatTimeOrNull } from '@/lib/locale-format'
import { centsToEur } from '@/lib/analytics/mappers/money'
import type { CommerceItem } from '@/lib/analytics/types'

const GIFT_CARD_ITEM_ID = 'cadeaubon'
const GIFT_CARD_CATEGORY = 'Cadeaubon'

function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function itemCategory(event: {
  categories?: { label: string }[] | null
}): string | undefined {
  return event.categories?.[0]?.label?.trim() || undefined
}

function itemCategory2(event: {
  record_type?: string | null
  product_type?: string | null
}): string | undefined {
  const productType = event.product_type?.trim()
  if (productType) return productType
  const recordType = event.record_type?.trim()
  if (recordType) return humanizeSlug(recordType)
  return undefined
}

export function formatItemVariantFromEventItem(eventItem: {
  city?: string | null
  delivery_type?: string | null
  start_at?: string | null
  end_at?: string | null
} | null | undefined): string | undefined {
  if (!eventItem) return undefined
  let city = eventItem.city?.trim() || null
  if (!city && eventItem.delivery_type?.toLowerCase() === 'online') {
    city = 'Online'
  }
  const date = formatDateShortOrNull(eventItem.start_at)
  const time = formatTimeOrNull(eventItem.start_at)
  const parts = [city, date, time].filter((s): s is string => Boolean(s?.trim()))
  return parts.length > 0 ? parts.join(' - ') : undefined
}

function priceFromEventCard(event: EventCard, variant?: EventVariant | null): number {
  if (variant?.prices?.[0]?.amount != null) {
    return centsToEur(variant.prices[0].amount)
  }
  if (event.price_from != null) return centsToEur(event.price_from)
  return 0
}

export function eventCardToCommerceItem(
  event: EventCard,
  options?: {
    index?: number
    variant?: EventVariant | null
    quantity?: number
  }
): CommerceItem {
  const variant = options?.variant
  const item: CommerceItem = {
    item_id: event.handle,
    item_name: event.title,
    price: priceFromEventCard(event, variant),
  }
  const cat = itemCategory(event)
  if (cat) item.item_category = cat
  const cat2 = itemCategory2(event)
  if (cat2) item.item_category2 = cat2
  const itemVariant = formatItemVariantFromEventItem(variant?.event_item)
  if (itemVariant) item.item_variant = itemVariant
  if (options?.index != null) item.index = options.index
  if (options?.quantity != null) item.quantity = options.quantity
  return item
}

export function agendaItemToCommerceItem(item: AgendaItem, index?: number): CommerceItem {
  const commerceItem: CommerceItem = {
    item_id: item.product_handle,
    item_name: item.product_title,
    price: item.price != null ? centsToEur(item.price) : 0,
  }
  const cat = itemCategory(item)
  if (cat) commerceItem.item_category = cat
  const cat2 = itemCategory2(item)
  if (cat2) commerceItem.item_category2 = cat2
  const variantParts = [
    item.city?.trim() || (item.delivery_type === 'online' ? 'Online' : null),
    formatDateShortOrNull(item.start_at),
    formatTimeOrNull(item.start_at),
  ].filter((s): s is string => Boolean(s?.trim()))
  if (variantParts.length > 0) {
    commerceItem.item_variant = variantParts.join(' - ')
  }
  if (index != null) commerceItem.index = index
  return commerceItem
}

export function cartLineToCommerceItem(
  item: CartItem,
  extras: CartItemExtras | null | undefined,
  index?: number
): CommerceItem {
  if (isGiftCardPurchaseLineItem(item)) {
    const meta = getGiftCardPurchaseMetaFromLineItem(item)
    const priceCents = meta?.amount_cents ?? item.unit_price
    return {
      item_id: GIFT_CARD_ITEM_ID,
      item_name: item.title?.trim() || 'Digitale cadeaubon',
      item_category: GIFT_CARD_CATEGORY,
      price: centsToEur(priceCents),
      quantity: item.quantity,
      ...(index != null ? { index } : {}),
    }
  }

  const handle = extras?.product_handle?.trim() || item.variant?.sku || item.id
  const commerceItem: CommerceItem = {
    item_id: handle,
    item_name: extras?.product_title?.trim() || item.title,
    price: centsToEur(item.unit_price),
    quantity: item.quantity,
  }
  if (extras?.event_item) {
    const variant = formatItemVariantFromEventItem(extras.event_item)
    if (variant) commerceItem.item_variant = variant
  }
  if (index != null) commerceItem.index = index
  return commerceItem
}

export function giftCardAmountItem(amountEuro: number): CommerceItem {
  return {
    item_id: GIFT_CARD_ITEM_ID,
    item_name: 'Digitale cadeaubon',
    item_category: GIFT_CARD_CATEGORY,
    price: amountEuro,
    quantity: 1,
  }
}

export function eventCardsToCommerceItems(events: EventCard[]): CommerceItem[] {
  return events.map((event, index) => eventCardToCommerceItem(event, { index: index + 1 }))
}
