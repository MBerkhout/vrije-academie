'use client'

import { commerceClient } from '@/lib/commerce'
import { clearCheckoutDraft } from '@/lib/commerce/checkout-draft'
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
}

/** Notify listeners (cart badge, checkout order overview, etc.) after a client-side cart mutation. */
export function dispatchCartUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('va:cart-updated'))
}

export async function getOrCreateCartId(): Promise<string> {
  const existing = getCartId()
  if (existing) {
    // Verify the cart still exists
    try {
      const cart = await commerceClient.getCart(existing)
      if (cart?.id) return existing
    } catch {
      // Cart expired or invalid; create a new one
    }
  }
  const cart = await commerceClient.createCart()
  setCartId(cart.id)
  return cart.id
}

export async function addVariantToCart(variantId: string): Promise<void> {
  const cartId = await getOrCreateCartId()
  await commerceClient.addToCart(cartId, variantId, 1)
  dispatchCartUpdated()
}
