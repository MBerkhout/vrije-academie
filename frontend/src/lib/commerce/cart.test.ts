import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CART_COOKIE } from './cart-cookie-name'

const getCart = vi.fn()
const createCart = vi.fn()

vi.mock('@/lib/commerce', () => ({
  commerceClient: {
    getCart: (...args: unknown[]) => getCart(...args),
    createCart: (...args: unknown[]) => createCart(...args),
    addToCart: vi.fn(),
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

describe('getActiveCart', () => {
  beforeEach(() => {
    document.cookie = `${CART_COOKIE}=; path=/; max-age=0`
    getCart.mockReset()
    createCart.mockReset()
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
