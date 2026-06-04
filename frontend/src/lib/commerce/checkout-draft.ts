'use client'

import type { Cart, CartUpdateInput } from './types'
import { isCartShippingComplete } from './checkout-profile'

const STORAGE_KEY = 'va_checkout_draft'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface CheckoutDraft {
  savedAt: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  address_1: string
  postal_code: string
  city: string
  country_code: string
}

export function buildCheckoutDraft(input: {
  email: string
  firstName: string
  lastName: string
  phone?: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
}): Omit<CheckoutDraft, 'savedAt'> {
  return {
    email: input.email.trim(),
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    address_1: `${input.street} ${input.houseNumber}`.trim(),
    postal_code: input.postalCode.trim(),
    city: input.city.trim(),
    country_code: input.country.toLowerCase(),
  }
}

export function draftFromCart(cart: Cart): Omit<CheckoutDraft, 'savedAt'> | null {
  if (!cart.email?.trim() || !isCartShippingComplete(cart)) return null
  const a = cart.shipping_address!
  return {
    email: cart.email.trim(),
    first_name: a.first_name!.trim(),
    last_name: a.last_name!.trim(),
    ...(a.phone?.trim() ? { phone: a.phone.trim() } : {}),
    address_1: a.address_1!.trim(),
    postal_code: a.postal_code!.trim(),
    city: a.city!.trim(),
    country_code: (a.country_code ?? 'nl').toLowerCase(),
  }
}

export function draftToCartUpdate(draft: Omit<CheckoutDraft, 'savedAt'>): CartUpdateInput {
  return {
    email: draft.email,
    shipping_address: {
      first_name: draft.first_name,
      last_name: draft.last_name,
      ...(draft.phone ? { phone: draft.phone } : {}),
      address_1: draft.address_1,
      postal_code: draft.postal_code,
      city: draft.city,
      country_code: draft.country_code,
    },
  }
}

export function saveCheckoutDraft(draft: Omit<CheckoutDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    /* quota / private mode */
  }
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckoutDraft
    if (!parsed?.email || !parsed.savedAt) return null
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearCheckoutDraft(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
