'use client'

import { commerceClient } from '@/lib/commerce'
import { clearCheckoutDraft } from '@/lib/commerce/checkout-draft'
import type { Cart } from '@/lib/commerce/types'
import { CART_COOKIE } from '@/lib/commerce/cart-cookie-name'

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

export function isCartCompleted(cart: Cart | null | undefined): boolean {
  return Boolean(cart?.completed_at?.trim())
}

/** Drop cookie when Medusa cart was converted to an order. */
export function discardCompletedCart(cart: Cart | null | undefined): boolean {
  if (!isCartCompleted(cart)) return false
  clearCartId()
  return true
}

/** Load cart from cookie; clears cookie when missing or already completed. */
export async function getActiveCart(): Promise<Cart | null> {
  const cartId = getCartId()
  if (!cartId) return null

  try {
    const cart = await commerceClient.getCart(cartId)
    if (!cart?.id) {
      clearCartId()
      return null
    }
    if (isCartCompleted(cart)) {
      clearCartId()
      return null
    }
    return cart
  } catch {
    clearCartId()
    return null
  }
}

export async function getOrCreateCartId(): Promise<string> {
  const active = await getActiveCart()
  if (active?.id) return active.id

  const cart = await commerceClient.createCart()
  setCartId(cart.id)
  dispatchCartUpdated()
  return cart.id
}

export async function addVariantToCart(variantId: string): Promise<void> {
  const cartId = await getOrCreateCartId()
  await commerceClient.addToCart(cartId, variantId, 1)
  dispatchCartUpdated()
}
