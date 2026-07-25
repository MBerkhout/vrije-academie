import { pushEvent } from '@/lib/analytics/data-layer'
import {
  agendaItemToCommerceItem,
  eventCardToCommerceItem,
  eventCardsToCommerceItems,
} from '@/lib/analytics/mappers/commerce-item'
import { buildCartEcommercePayload } from '@/lib/analytics/mappers/cart'
import { centsToEur } from '@/lib/analytics/mappers/money'
import type { AgendaItem, Cart, EventCard, EventVariant } from '@/lib/commerce/types'
import type { ItemListContext, UserData } from '@/lib/analytics/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'

export function trackAddToWishlist(event: EventCard): void {
  const item = eventCardToCommerceItem(event)
  pushEvent({
    event: 'add_to_wishlist',
    currency: 'EUR',
    value: item.price ?? 0,
    items: [item],
  })
}

export function trackViewPromotion(
  promotionId: string,
  promotionName: string,
  creativeSlot: string
): void {
  pushEvent({
    event: 'view_promotion',
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_slot: creativeSlot,
  })
}

export function trackSelectPromotion(
  promotionId: string,
  promotionName: string,
  creativeSlot: string
): void {
  pushEvent({
    event: 'select_promotion',
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_slot: creativeSlot,
  })
}

export function trackViewItemList(
  list: ItemListContext,
  events: EventCard[] | AgendaItem[],
  options?: { loadType?: 'infinite_scroll'; batchId?: string }
): void {
  const items =
    events.length > 0 && 'product_handle' in events[0]
      ? (events as AgendaItem[]).map((item, index) => agendaItemToCommerceItem(item, index + 1))
      : eventCardsToCommerceItems(events as EventCard[])

  pushEvent({
    event: 'view_item_list',
    item_list_id: list.item_list_id,
    item_list_name: list.item_list_name,
    items,
    ...(options?.loadType ? { load_type: options.loadType } : {}),
    ...(options?.batchId ? { batch_id: options.batchId } : {}),
  })
}

export function trackSelectItem(
  list: ItemListContext,
  event: EventCard | AgendaItem,
  index?: number
): void {
  const item =
    'product_handle' in event
      ? agendaItemToCommerceItem(event, index)
      : eventCardToCommerceItem(event, { index })

  pushEvent({
    event: 'select_item',
    item_list_id: list.item_list_id,
    item_list_name: list.item_list_name,
    items: [item],
  })
}

export function trackFilterChange(options: {
  scope: 'aanbod_overzicht' | 'activiteit_detail'
  filterName: string
  filterValue: string
  resultsCount: number
  itemId?: string
}): void {
  pushEvent({
    event: 'filter_change',
    scope: options.scope,
    filter_name: options.filterName,
    filter_value: options.filterValue,
    results_count: options.resultsCount,
    ...(options.itemId ? { item_id: options.itemId } : {}),
  })
}

export function trackSortChange(itemListId: string, sortOption: string): void {
  pushEvent({
    event: 'sort_change',
    item_list_id: itemListId,
    sort_option: sortOption,
  })
}

export function trackViewItem(event: EventCard, variant?: EventVariant | null): void {
  const item = eventCardToCommerceItem(event, { variant })
  pushEvent({
    event: 'view_item',
    currency: 'EUR',
    value: item.price ?? 0,
    items: [item],
  })
}

export function trackAddToCart(
  event: EventCard,
  variant: EventVariant | null | undefined,
  quantity = 1
): void {
  const item = eventCardToCommerceItem(event, { variant, quantity })
  pushEvent({
    event: 'add_to_cart',
    currency: 'EUR',
    value: (item.price ?? 0) * quantity,
    items: [item],
  })
}

export function trackSelectCadeaubonBedrag(bedragEuro: number): void {
  pushEvent({
    event: 'select_cadeaubon_bedrag',
    bedrag: bedragEuro,
  })
}

export function trackViewCart(cart: Cart, extrasList: (CartItemExtras | null)[] = []): void {
  const payload = buildCartEcommercePayload(cart, extrasList)
  pushEvent({ event: 'view_cart', ...payload })
}

export function trackRemoveFromCart(
  cart: Cart,
  extrasList: (CartItemExtras | null)[],
  removedLineId: string
): void {
  const payload = buildCartEcommercePayload(cart, extrasList)
  const removed = payload.items.find((_, i) => cart.items[i]?.id === removedLineId)
  const value = removed ? (removed.price ?? 0) * (removed.quantity ?? 1) : payload.value
  pushEvent({
    event: 'remove_from_cart',
    currency: 'EUR',
    value,
    items: removed ? [removed] : payload.items,
  })
}

export function trackCartQuantityChange(
  itemId: string,
  quantityOld: number,
  quantityNew: number
): void {
  pushEvent({
    event: 'cart_quantity_change',
    item_id: itemId,
    quantity_old: quantityOld,
    quantity_new: quantityNew,
  })
}

export function trackApplyCoupon(coupon: string, cartTotalCents: number): void {
  pushEvent({
    event: 'apply_coupon',
    coupon: coupon.trim(),
    currency: 'EUR',
    value: centsToEur(cartTotalCents),
  })
}

export function trackBeginCheckout(
  cart: Cart,
  extrasList: (CartItemExtras | null)[],
  userData?: UserData
): void {
  const payload = buildCartEcommercePayload(cart, extrasList)
  pushEvent({
    event: 'begin_checkout',
    ...payload,
    ...(userData ? { user_data: userData } : {}),
  })
}

export function trackAddPaymentInfo(
  paymentType: string,
  cartTotalCents: number,
  userData?: UserData
): void {
  pushEvent({
    event: 'add_payment_info',
    currency: 'EUR',
    value: centsToEur(cartTotalCents),
    payment_type: paymentType,
    ...(userData ? { user_data: userData } : {}),
  })
}

export function trackCheckoutStepView(step: number, stepName: string): void {
  pushEvent({
    event: 'checkout_step_view',
    step,
    step_name: stepName,
  })
}

export function trackVideoStart(itemId: string, itemName: string, videoProvider = 'vimeo'): void {
  pushEvent({
    event: 'video_start',
    item_id: itemId,
    item_name: itemName,
    video_provider: videoProvider,
  })
}

export function trackVideoProgress(itemId: string, videoPercent: number): void {
  pushEvent({
    event: 'video_progress',
    item_id: itemId,
    video_percent: videoPercent,
  })
}

export function trackVideoComplete(itemId: string): void {
  pushEvent({
    event: 'video_complete',
    item_id: itemId,
  })
}

export function trackViewAccount(accountSection: string): void {
  pushEvent({
    event: 'view_account',
    account_section: accountSection,
  })
}

export function trackUpdateAccountInfo(updatedFields: string[], email: string): void {
  pushEvent({
    event: 'update_account_info',
    updated_fields: updatedFields,
    user_data: { email: email.trim() },
  })
}
