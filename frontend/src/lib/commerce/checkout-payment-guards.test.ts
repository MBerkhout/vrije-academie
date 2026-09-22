import { describe, expect, it } from 'vitest'
import { checkoutPaymentErrorMessage, resolveCheckoutPaymentDestination } from './checkout-payment-guards'
import type { Cart, Customer } from './types'

function cart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart_1',
    items: [{ id: 'li_1', variant_id: 'var_1', quantity: 1, unit_price: 1000, subtotal: 1000, total: 1000, title: 'Les', variant: {} as Cart['items'][0]['variant'] }],
    subtotal: 1000,
    discount_total: 0,
    tax_total: 0,
    total: 1000,
    ...overrides,
  }
}

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cus_1',
    email: 'a@b.nl',
    first_name: 'Ada',
    last_name: 'Lovelace',
    addresses: [
      {
        address_1: 'Keizersgracht 1',
        postal_code: '1015 CJ',
        city: 'Amsterdam',
        country_code: 'nl',
        is_default_shipping: true,
      },
    ],
    ...overrides,
  }
}

describe('resolveCheckoutPaymentDestination', () => {
  it('sends missing or empty carts back to the cart page', () => {
    expect(
      resolveCheckoutPaymentDestination({
        cookiePresent: false,
        cart: null,
        loadError: false,
        customer: null,
      })
    ).toBe('/winkelwagen')
    expect(
      resolveCheckoutPaymentDestination({
        cookiePresent: true,
        cart: cart({ items: [] }),
        loadError: false,
        customer: customer(),
      })
    ).toBe('/winkelwagen')
  })

  it('does not bounce to cart when the cookie is still there but retrieve failed', () => {
    expect(
      resolveCheckoutPaymentDestination({
        cookiePresent: true,
        cart: null,
        loadError: true,
        customer: customer(),
      })
    ).toBe('retry')
  })

  it('lets a complete logged-in customer stay even when the cart has no email yet', () => {
    expect(
      resolveCheckoutPaymentDestination({
        cookiePresent: true,
        cart: cart({ email: null }),
        loadError: false,
        customer: customer(),
      })
    ).toBe('stay')
  })

  it('sends incomplete logged-in customers to the login/details step', () => {
    expect(
      resolveCheckoutPaymentDestination({
        cookiePresent: true,
        cart: cart(),
        loadError: false,
        customer: customer({ first_name: '', addresses: [] }),
      })
    ).toBe('/checkout/inloggen')
  })

  it('sends guests without email or shipping to the login step', () => {
    expect(
      resolveCheckoutPaymentDestination({
        cookiePresent: true,
        cart: cart({ email: null }),
        loadError: false,
        customer: null,
      })
    ).toBe('/checkout/inloggen')
  })
})

describe('checkoutPaymentErrorMessage', () => {
  it('maps Medusa leftover payment-session errors', () => {
    expect(
      checkoutPaymentErrorMessage({
        message: 'Could not delete all payment sessions',
      })
    ).toBe('Je vorige betaalpoging kon niet worden afgesloten. Probeer het opnieuw.')
  })

  it('keeps other API messages', () => {
    expect(checkoutPaymentErrorMessage(new Error('Geen betaallink ontvangen van Mollie.'))).toBe(
      'Geen betaallink ontvangen van Mollie.'
    )
  })
})
