'use client'

import { commerceClient } from '@/lib/commerce'
import { getCartId } from '@/lib/commerce/cart'
import { draftToCartUpdate, loadCheckoutDraft } from '@/lib/commerce/checkout-draft'
import { isGuestCartCheckoutReady } from '@/lib/commerce/checkout-profile'
import type { Cart } from '@/lib/commerce/types'

/** Load cart and re-apply session draft when Medusa cart lost guest checkout fields. */
export async function ensureGuestCheckoutCartHydrated(): Promise<Cart | null> {
  const cartId = getCartId()
  if (!cartId) return null

  let cart = await commerceClient.getCart(cartId)
  if (!cart) return null
  if (isGuestCartCheckoutReady(cart)) return cart

  const draft = loadCheckoutDraft()
  if (!draft) return cart

  try {
    cart = await commerceClient.updateCart(cartId, draftToCartUpdate(draft))
  } catch {
    /* keep partial cart */
  }
  return cart
}
