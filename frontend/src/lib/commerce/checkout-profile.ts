/**
 * Checkout profile completeness and mapping (logged-in customer vs cart for guests).
 */

import type { Address, Cart, Customer } from './types'

function nonEmpty(s?: string | null): boolean {
  return typeof s === 'string' && s.trim().length > 0
}

/**
 * Prefer `is_default_shipping`, else first row with a usable postal line, else first address.
 */
export function getDefaultCheckoutAddress(
  customer: Customer | null
): Address | null {
  if (!customer?.addresses?.length) return null
  const list = customer.addresses
  const def = list.find((a) => a.is_default_shipping === true)
  if (def && nonEmpty(def.address_1)) return def
  const complete = list.filter(
    (a) =>
      nonEmpty(a.address_1) && nonEmpty(a.postal_code) && nonEmpty(a.city) && nonEmpty(a.country_code)
  )
  if (complete.length) return complete[0]
  return list[0] ?? null
}

export function isCustomerProfileComplete(customer: Customer | null): boolean {
  if (!customer) return false
  if (!nonEmpty(customer.first_name) || !nonEmpty(customer.last_name)) return false
  const addr = getDefaultCheckoutAddress(customer)
  if (!addr) return false
  return (
    nonEmpty(addr.address_1) &&
    nonEmpty(addr.postal_code) &&
    nonEmpty(addr.city) &&
    nonEmpty(addr.country_code)
  )
}

/** Guest checkout: cart holds shipping until there is a customer. */
export function isCartShippingComplete(cart: Cart | null): boolean {
  const a = cart?.shipping_address
  if (!a) return false
  return (
    nonEmpty(a.first_name) &&
    nonEmpty(a.last_name) &&
    nonEmpty(a.address_1) &&
    nonEmpty(a.postal_code) &&
    nonEmpty(a.city) &&
    nonEmpty(a.country_code)
  )
}

/** Payload for Medusa `cart.update` from a complete customer profile. */
export function customerToShippingPayload(customer: Customer): Partial<Address> | null {
  if (!isCustomerProfileComplete(customer)) return null
  const addr = getDefaultCheckoutAddress(customer)!
  return {
    first_name: customer.first_name!.trim(),
    last_name: customer.last_name!.trim(),
    ...(customer.phone?.trim() ? { phone: customer.phone.trim() } : {}),
    address_1: addr.address_1!.trim(),
    postal_code: addr.postal_code!.trim(),
    city: addr.city!.trim(),
    country_code: (addr.country_code ?? 'nl').toLowerCase(),
  }
}

/** Split a single Medusa `address_1` into straat + huisnummer for the checkout form (Dutch-style). */
export function splitAddressLine(line: string): { street: string; houseNumber: string } {
  const t = line.trim()
  const m = t.match(/^(.+?)\s+(\d+.*)$/)
  if (m) return { street: m[1].trim(), houseNumber: m[2].trim() }
  return { street: t, houseNumber: '' }
}
