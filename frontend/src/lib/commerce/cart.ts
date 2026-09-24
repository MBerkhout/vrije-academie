'use client'

import { commerceClient } from '@/lib/commerce'
import { clearCheckoutDraft } from '@/lib/commerce/checkout-draft'
import { trackAddToCart } from '@/lib/analytics/events/ecommerce'
import type { Cart, EventCard, EventVariant } from '@/lib/commerce/types'
import { CART_COOKIE } from '@/lib/commerce/cart-cookie-name'
import { parseGiftCardRedemptions } from '@/lib/commerce/gift-card'

export type AddToCartTrackingContext = {
  event: EventCard
  variant?: EventVariant | null
  quantity?: number
}

let syncedCustomerId: string | null = null
let accountCartSyncInFlight: Promise<string | null> | null = null

export function isCheckoutPath(pathname?: string): boolean {
  const path =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  return path.startsWith('/checkout')
}

export function resetAccountCartSync(): void {
  syncedCustomerId = null
  accountCartSyncInFlight = null
}

/**
 * Merge open customer carts into the account cart (outside checkout only).
 * Returns the active cart id when sync ran or was already done for this customer.
 */
export async function ensureAccountCartSynced(): Promise<string | null> {
  if (typeof window === 'undefined') return getCartId()
  if (isCheckoutPath()) return getCartId()

  const customer = await commerceClient.getCustomer()
  if (!customer?.id) {
    resetAccountCartSync()
    return getCartId()
  }

  if (syncedCustomerId === customer.id) {
    return getCartId()
  }

  if (accountCartSyncInFlight) {
    return accountCartSyncInFlight
  }

  accountCartSyncInFlight = (async () => {
    try {
      const localCartId = getCartId()
      const cart = await commerceClient.syncAccountCart(localCartId ?? undefined)
      if (cart?.id) {
        setCartId(cart.id)
        dispatchCartUpdated()
      }
      syncedCustomerId = customer.id
      return cart?.id ?? getCartId()
    } catch {
      syncedCustomerId = customer.id
      return getCartId()
    } finally {
      accountCartSyncInFlight = null
    }
  })()

  return accountCartSyncInFlight
}

export function getCartId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CART_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function setCartId(id: string): void {
  const maxAge = 60 * 60 * 24 * 30 // 30 days
  document.cookie = `${CART_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function clearCartId(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${CART_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  clearCheckoutDraft()
  dispatchCartUpdated()
}

/** Notify listeners (cart badge, checkout order overview, etc.) after a client-side cart mutation. */
export function dispatchCartUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('va:cart-updated'))
}

const giftCardSyncInflight = new Map<string, Promise<Cart>>()

/** Re-apply saved cadeaubon codes against the current cart total (best-effort). */
export async function syncAppliedGiftCardCredits(cart: Cart): Promise<Cart> {
  if (parseGiftCardRedemptions(cart.metadata).length === 0) return cart
  const inflight = giftCardSyncInflight.get(cart.id)
  if (inflight) return inflight
  const promise = commerceClient
    .syncGiftCardCredits(cart.id)
    .catch(() => cart)
    .finally(() => {
      if (giftCardSyncInflight.get(cart.id) === promise) giftCardSyncInflight.delete(cart.id)
    })
  giftCardSyncInflight.set(cart.id, promise)
  return promise
}

export function isCartCompleted(cart: Cart | null | undefined): boolean {
  return Boolean(cart?.completed_at?.trim())
}

/** Drop cookie when Medusa cart was converted to an order. */
export function discardCompletedCart(cart: Cart | null | undefined): boolean {
  if (!isCartCompleted(cart)) return false
  clearCartId()
  return true
}

/**
 * Load cart from cookie.
 * Clears the cookie only when Medusa says the cart is gone (404/empty) or already completed.
 * Retrieve failures (401/5xx/network) throw and leave the cookie so checkout cannot
 * wipe a still-valid guest cart after login and bounce back to /winkelwagen.
 */
export async function getActiveCart(): Promise<Cart | null> {
  const cartId = getCartId()
  if (!cartId) return null

  const cart = await commerceClient.getCart(cartId)
  if (!cart?.id) {
    clearCartId()
    return null
  }
  if (isCartCompleted(cart)) {
    clearCartId()
    return null
  }
  return syncAppliedGiftCardCredits(cart)
}

export async function getOrCreateCartId(): Promise<string> {
  if (typeof window !== 'undefined' && !isCheckoutPath()) {
    await ensureAccountCartSynced()
  }

  const existingId = getCartId()
  try {
    const active = await getActiveCart()
    if (active?.id) return active.id
  } catch {
    if (existingId) throw new Error('CART_UNAVAILABLE')
  }

  const cart = await commerceClient.createCart()
  setCartId(cart.id)
  dispatchCartUpdated()
  return cart.id
}

export async function addVariantToCart(
  variantId: string,
  tracking?: AddToCartTrackingContext
): Promise<void> {
  const cartId = await getOrCreateCartId()
  const isVathuisBundle = tracking?.event?.purchase_mode === 'bundle_only'
  const quantity = isVathuisBundle ? 1 : tracking?.quantity ?? 1

  if (isVathuisBundle) {
    const cart = await commerceClient.getCart(cartId)
    const existing = cart?.items?.find((item) => item.variant_id === variantId)
    if (existing) {
      if (existing.quantity > 1) {
        await commerceClient.updateCartItem(cartId, existing.id, 1)
        dispatchCartUpdated()
      }
      return
    }
  }

  let updated = await commerceClient.addToCart(cartId, variantId, quantity)
  updated = await syncAppliedGiftCardCredits(updated)
  dispatchCartUpdated()
  if (tracking) {
    trackAddToCart(tracking.event, tracking.variant, quantity)
  }
}
