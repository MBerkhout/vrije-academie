/**
 * Payment-step entry guards. Keep this free of navigation so the loop
 * cart → betaling → cart can be unit-tested.
 */

import { isCartShippingComplete, isCustomerProfileComplete } from './checkout-profile'
import type { Cart, Customer } from './types'

export type CheckoutPaymentDestination =
  | '/winkelwagen'
  | '/checkout/inloggen'
  | 'stay'
  | 'retry'

export function resolveCheckoutPaymentDestination(input: {
  cookiePresent: boolean
  cart: Cart | null
  loadError: boolean
  customer: Customer | null
}): CheckoutPaymentDestination {
  if (input.loadError && input.cookiePresent) return 'retry'
  if (!input.cart || (input.cart.items?.length ?? 0) === 0) return '/winkelwagen'

  if (input.customer) {
    if (!isCustomerProfileComplete(input.customer)) return '/checkout/inloggen'
    // Email/shipping may still live only on the customer; payment form syncs the cart.
    return 'stay'
  }

  if (!input.cart.email?.trim() || !isCartShippingComplete(input.cart)) {
    return '/checkout/inloggen'
  }

  return 'stay'
}
