import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CART_COOKIE } from './cart-cookie-name'

const getCart = vi.fn()
const createCart = vi.fn()
const addToCart = vi.fn()
const updateCartItem = vi.fn()
const getCustomer = vi.fn()
const syncAccountCart = vi.fn()
const syncGiftCardCredits = vi.fn()

vi.mock('@/lib/commerce', () => ({
  commerceClient: {
    getCart: (...args: unknown[]) => getCart(...args),
    createCart: (...args: unknown[]) => createCart(...args),
    addToCart: (...args: unknown[]) => addToCart(...args),
    updateCartItem: (...args: unknown[]) => updateCartItem(...args),
    getCustomer: (...args: unknown[]) => getCustomer(...args),
    syncAccountCart: (...args: unknown[]) => syncAccountCart(...args),
    syncGiftCardCredits: (...args: unknown[]) => syncGiftCardCredits(...args),
  },
}))

vi.mock('@/lib/commerce/checkout-draft', () => ({
  clearCheckoutDraft: vi.fn(),
}))

vi.mock('@/lib/analytics/events/ecommerce', () => ({
  trackAddToCart: vi.fn(),
}))

function readCartCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CART_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCartCookie(id: string) {
  document.cookie = `${CART_COOKIE}=${encodeURIComponent(id)}; path=/`
}

describe('isCheckoutPath', () => {
  it('detects checkout routes', async () => {
    const { isCheckoutPath } = await import('./cart')
    expect(isCheckoutPath('/checkout/betaling')).toBe(true)
    expect(isCheckoutPath('/checkout/inloggen')).toBe(true)
    expect(isCheckoutPath('/winkelwagen')).toBe(false)
  })
})

describe('getActiveCart', () => {
  beforeEach(async () => {
    document.cookie = `${CART_COOKIE}=; path=/; max-age=0`
    getCart.mockReset()
    createCart.mockReset()
    addToCart.mockReset()
    updateCartItem.mockReset()
    getCustomer.mockReset()
    syncAccountCart.mockReset()
    syncGiftCardCredits.mockReset()
    vi.resetModules()
  })

  it('keeps the cart cookie when retrieve throws (auth/network)', async () => {
    writeCartCookie('cart_keep')
    getCart.mockRejectedValue(Object.assign(new Error('fail'), { status: 401 }))

    const { getActiveCart } = await import('./cart')
    await expect(getActiveCart()).rejects.toThrow('fail')
    expect(readCartCookie()).toBe('cart_keep')
  })

  it('clears the cookie when the cart is missing or completed', async () => {
    writeCartCookie('cart_gone')
    getCart.mockResolvedValue(null)

    const { getActiveCart } = await import('./cart')
    expect(await getActiveCart()).toBeNull()
    expect(readCartCookie()).toBeNull()
  })
})

describe('syncAppliedGiftCardCredits', () => {
  beforeEach(async () => {
    syncGiftCardCredits.mockReset()
    vi.resetModules()
  })

  it('shares one in-flight sync when header and cart refresh together', async () => {
    let release: (cart: { id: string }) => void = () => {}
    syncGiftCardCredits.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        })
    )
    const { syncAppliedGiftCardCredits } = await import('./cart')
    const cart = {
      id: 'cart_1',
      metadata: { gift_card_redemptions: [{ code: 'UN7EZAH', gift_card_id: 'gc_1' }] },
    }
    const first = syncAppliedGiftCardCredits(cart as never)
    const second = syncAppliedGiftCardCredits(cart as never)
    expect(syncGiftCardCredits).toHaveBeenCalledTimes(1)
    release({ id: 'cart_1', total: 0 })
    await expect(first).resolves.toEqual({ id: 'cart_1', total: 0 })
    await expect(second).resolves.toEqual({ id: 'cart_1', total: 0 })
  })
})

describe('addVariantToCart', () => {
  beforeEach(async () => {
    document.cookie = `${CART_COOKIE}=; path=/; max-age=0`
    getCart.mockReset()
    createCart.mockReset()
    addToCart.mockReset()
    updateCartItem.mockReset()
    getCustomer.mockReset()
    syncAccountCart.mockReset()
    syncGiftCardCredits.mockReset()
    addToCart.mockResolvedValue({ id: 'cart_1', items: [] })
    updateCartItem.mockResolvedValue({ id: 'cart_1', items: [] })
    writeCartCookie('cart_1')
    vi.resetModules()
  })

  it('does not add a VA Thuis bundle that is already in the cart', async () => {
    getCart.mockResolvedValue({
      id: 'cart_1',
      items: [{ id: 'li1', variant_id: 'var_bundle', quantity: 1 }],
    })

    const { addVariantToCart } = await import('./cart')
    await addVariantToCart('var_bundle', {
      event: {
        id: 'prod_1',
        handle: 'college-filosofie',
        title: 'College filosofie',
        purchase_mode: 'bundle_only',
      },
    })

    expect(addToCart).not.toHaveBeenCalled()
    expect(updateCartItem).not.toHaveBeenCalled()
  })

  it('adds a VA Thuis bundle at quantity 1', async () => {
    getCart.mockResolvedValue({ id: 'cart_1', items: [] })

    const { addVariantToCart } = await import('./cart')
    await addVariantToCart('var_bundle', {
      event: {
        id: 'prod_1',
        handle: 'college-filosofie',
        title: 'College filosofie',
        purchase_mode: 'bundle_only',
      },
    })

    expect(addToCart).toHaveBeenCalledWith('cart_1', 'var_bundle', 1)
  })
})

describe('ensureAccountCartSynced', () => {
  beforeEach(async () => {
    document.cookie = `${CART_COOKIE}=; path=/; max-age=0`
    getCart.mockReset()
    createCart.mockReset()
    getCustomer.mockReset()
    syncAccountCart.mockReset()
    syncGiftCardCredits.mockReset()
    vi.resetModules()
  })

  it('skips sync on checkout routes', async () => {
    writeCartCookie('cart_checkout')
    getCustomer.mockResolvedValue({ id: 'cus_1', email: 'a@b.nl' })

    const { ensureAccountCartSynced } = await import('./cart')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/checkout/betaling' },
    })

    await expect(ensureAccountCartSynced()).resolves.toBe('cart_checkout')
    expect(syncAccountCart).not.toHaveBeenCalled()
  })

  it('merges account carts and updates the cookie when logged in', async () => {
    writeCartCookie('cart_local')
    getCustomer.mockResolvedValue({ id: 'cus_1', email: 'a@b.nl' })
    syncAccountCart.mockResolvedValue({ id: 'cart_canonical', items: [] })
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/winkelwagen' },
    })

    const { ensureAccountCartSynced } = await import('./cart')
    await expect(ensureAccountCartSynced()).resolves.toBe('cart_canonical')
    expect(syncAccountCart).toHaveBeenCalledWith('cart_local')
    expect(readCartCookie()).toBe('cart_canonical')
  })

  it('does not call sync again for the same customer in one session', async () => {
    writeCartCookie('cart_local')
    getCustomer.mockResolvedValue({ id: 'cus_1', email: 'a@b.nl' })
    syncAccountCart.mockResolvedValue({ id: 'cart_canonical', items: [] })
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/ons-aanbod' },
    })

    const { ensureAccountCartSynced } = await import('./cart')
    await ensureAccountCartSynced()
    await ensureAccountCartSynced()
    expect(syncAccountCart).toHaveBeenCalledTimes(1)
  })
})
