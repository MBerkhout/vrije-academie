/**
 * Medusa implementation of Commerce client
 */

import Medusa from '@medusajs/js-sdk'
import { getMedusaBackendUrl } from './medusa-backend-url'
import type {
  CommerceClient,
  Product,
  EventCard,
  Cart,
  CartUpdateInput,
  Customer,
  Address,
  CustomerCheckoutAddressInput,
  CustomerProfileUpdateInput,
  PaymentProvider,
  PaymentSession,
  Order,
  OrderItem,
  RegisterInput,
  Variant,
  ProductFilters,
  EventFilters,
  PaginatedEventFilters,
  EventListResult,
  AgendaFilters,
  AgendaListResult,
  EventFacets,
  AgendaItem,
} from './types'
import { customerToShippingPayload } from './checkout-profile'
import {
  addRecentViewedHandle,
  getRecentViewedHandlesLocal,
  parseRecentViewedHandles,
  RECENT_VIEWED_METADATA_KEY,
  setRecentViewedHandlesLocal,
} from './recent-viewed'
import {
  WISHLIST_METADATA_KEY,
  addHandleToList,
  normalizeHandle,
  parseWishlistHandles,
  removeHandleFromList,
} from './wishlist'
import { sortCityFacetsByCount } from './city-facets'

function getFetchStatus(e: unknown): number | undefined {
  if (typeof e === 'object' && e !== null && 'status' in e) {
    const s = (e as { status: unknown }).status
    return typeof s === 'number' ? s : undefined
  }
  return undefined
}

/** Medusa still returns `docenten` in JSON; normalize to app-facing `teachers`. */
function normalizeDocentenRow(row: Record<string, unknown>): Record<string, unknown> {
  let out = row
  if ('docenten' in row && !('teachers' in row)) {
    const { docenten, ...rest } = row
    out = { ...rest, teachers: docenten }
  }
  if (Array.isArray(out.cities) && out.cities.length > 0 && typeof out.cities[0] === 'object') {
    out = {
      ...out,
      cities: (out.cities as { label?: string; slug?: string }[]).map(
        (c) => c.label ?? c.slug ?? ''
      ).filter(Boolean),
    }
  }
  return out
}

function normalizeEventFacets(raw: unknown): EventFacets {
  const f = (raw ?? {}) as Partial<EventFacets> & {
    docenten?: EventFacets['teachers']
  }
  return {
    record_type: f.record_type ?? [],
    product_type: f.product_type ?? [],
    categories: f.categories ?? [],
    teachers: f.teachers ?? f.docenten ?? [],
    cities: sortCityFacetsByCount(f.cities ?? []),
    delivery_type: f.delivery_type ?? [],
    day_part: f.day_part ?? [],
  }
}

const BACKEND_URL = getMedusaBackendUrl()
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_API_KEY ?? ''

/** Must match @medusajs/js-sdk default when using jwt + local storage. */
const MEDUSA_JWT_STORAGE_KEY = 'medusa_auth_token'

function getStoredJwt(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(MEDUSA_JWT_STORAGE_KEY)
}

function parseMoney(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (v && typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>
    if (typeof o.numeric_ === 'number') return o.numeric_
    if (typeof o.amount === 'number') return o.amount
  }
  return 0
}

function mapStoreOrderItem(raw: unknown): OrderItem {
  const o = raw as Record<string, unknown>
  const unit = parseMoney(o.unit_price)
  const qty = typeof o.quantity === 'number' ? o.quantity : Number(o.quantity ?? 1)
  return {
    id: String(o.id ?? ''),
    title: String(o.title ?? o.product_title ?? '—'),
    quantity: qty,
    unit_price: unit,
    total: parseMoney(o.total ?? unit * qty),
    thumbnail: (o.thumbnail as string | null | undefined) ?? null,
    variant: (o.variant as Variant | null | undefined) ?? null,
  }
}

function mapStoreOrder(raw: unknown): Order {
  const o = raw as Record<string, unknown>
  const items = Array.isArray(o.items) ? o.items.map(mapStoreOrderItem) : undefined
  return {
    id: String(o.id ?? ''),
    display_id: typeof o.display_id === 'number' ? o.display_id : undefined,
    status: String(o.status ?? ''),
    email: o.email as string | undefined,
    total: parseMoney(o.total),
    subtotal: parseMoney(o.subtotal ?? o.total),
    discount_total: o.discount_total !== undefined ? parseMoney(o.discount_total) : undefined,
    tax_total: o.tax_total !== undefined ? parseMoney(o.tax_total) : undefined,
    currency_code: typeof o.currency_code === 'string' ? o.currency_code : undefined,
    items,
    payment_status: typeof o.payment_status === 'string' ? o.payment_status : undefined,
    created_at: typeof o.created_at === 'string' ? o.created_at : undefined,
  }
}

const medusa = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  // Session cookies are not sent cross-origin (e.g. :3000 → :9000). JWT in Authorization works.
  auth: {
    type: 'jwt',
    jwtTokenStorageMethod: 'local',
    jwtTokenStorageKey: MEDUSA_JWT_STORAGE_KEY,
  },
})

function storeHeaders(): HeadersInit {
  return PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {}
}

function storeAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = window.localStorage.getItem(MEDUSA_JWT_STORAGE_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function storeFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: { ...storeHeaders(), ...storeAuthHeaders(), ...(init?.headers ?? {}) },
  })
}

const CUSTOMER_RETRIEVE_FIELDS = '*addresses' as const

async function retrieveAuthenticatedCustomer(): Promise<Customer | null> {
  try {
    const { customer } = await medusa.store.customer.retrieve({
      fields: CUSTOMER_RETRIEVE_FIELDS,
    })
    return customer as Customer
  } catch (e) {
    const status = getFetchStatus(e)
    if (status === 401) {
      try {
        await medusa.auth.refresh()
        const { customer } = await medusa.store.customer.retrieve({
          fields: CUSTOMER_RETRIEVE_FIELDS,
        })
        return customer as Customer
      } catch {
        // fall through
      }
    }
    return null
  }
}

export const medusaClient: CommerceClient = {
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const params: any = {}
    if (filters?.limit) {
      params.limit = filters.limit
    }

    const response = await medusa.store.product.list(params)
    return response.products || []
  },

  async getProduct(handle: string): Promise<Product | null> {
    try {
      const response = await medusa.store.product.retrieve(handle)
      return response.product || null
    } catch (error) {
      return null
    }
  },

  async getEvents(filters?: EventFilters): Promise<EventCard[]> {
    const params: any = {}
    if (filters?.category) {
      params.metadata = { category: filters.category }
    }
    if (filters?.limit) {
      params.limit = filters.limit
    }

    // Use custom events endpoint
    const response = await fetch(
      `${BACKEND_URL}/store/events?${new URLSearchParams(params)}`,
      { headers: storeHeaders() }
    )
    const data = await response.json()
    const raw = data.events || []
    return raw.map((e: Record<string, unknown>) => normalizeDocentenRow(e)) as unknown as EventCard[]
  },

  async getEvent(handle: string): Promise<EventCard | null> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/store/events/${handle}`,
        { headers: storeHeaders() }
      )
      if (!response.ok) return null
      const data = await response.json()
      const ev = data.event
      if (!ev) return null
      return normalizeDocentenRow(ev as Record<string, unknown>) as unknown as EventCard
    } catch (error) {
      return null
    }
  },

  async getSimilarEvents(handle: string): Promise<EventCard[]> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/store/events/${handle}/similar`,
        { headers: storeHeaders() }
      )
      if (!response.ok) return []
      const data = await response.json()
      const raw = data.similar ?? []
      return raw.map((e: Record<string, unknown>) => normalizeDocentenRow(e)) as unknown as EventCard[]
    } catch {
      return []
    }
  },

  async getEventsPaginated(filters?: PaginatedEventFilters): Promise<EventListResult> {
    const params = new URLSearchParams()

    if (filters?.q) params.set('q', filters.q)
    if (filters?.sort) params.set('sort', filters.sort)
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.offset) params.set('offset', String(filters.offset))
    if (filters?.periodStart) params.set('period_start', filters.periodStart)
    if (filters?.periodEnd) params.set('period_end', filters.periodEnd)

    for (const v of filters?.categories ?? []) params.append('category[]', v)
    for (const v of filters?.teachers ?? []) params.append('docent[]', v)
    for (const v of filters?.recordTypes ?? []) params.append('record_type[]', v)
    for (const v of filters?.productTypes ?? []) params.append('product_type[]', v)
    for (const v of filters?.deliveryTypes ?? []) params.append('delivery_type[]', v)
    for (const v of filters?.cities ?? []) params.append('city[]', v)
    for (const v of filters?.dayParts ?? []) params.append('day_part[]', v)

    const response = await fetch(`${BACKEND_URL}/store/events?${params.toString()}`, {
      headers: storeHeaders(),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`)
    }
    const data = await response.json()
    const events = (data.events ?? []).map((e: Record<string, unknown>) =>
      normalizeDocentenRow(e)
    ) as unknown as EventCard[]
    return {
      events,
      count: data.count ?? 0,
      facets: normalizeEventFacets(data.facets),
    }
  },

  async getAgendaPaginated(filters?: AgendaFilters): Promise<AgendaListResult> {
    const params = new URLSearchParams()

    if (filters?.q) params.set('q', filters.q)
    if (filters?.sort) params.set('sort', filters.sort)
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.offset) params.set('offset', String(filters.offset))
    if (filters?.periodStart) params.set('period_start', filters.periodStart)
    if (filters?.periodEnd) params.set('period_end', filters.periodEnd)
    if (filters?.date) params.set('date', filters.date)
    if (filters?.includePast) params.set('include_past', 'true')

    for (const v of filters?.categories ?? []) params.append('category[]', v)
    for (const v of filters?.teachers ?? []) params.append('docent[]', v)
    for (const v of filters?.recordTypes ?? []) params.append('record_type[]', v)
    for (const v of filters?.productTypes ?? []) params.append('product_type[]', v)
    for (const v of filters?.deliveryTypes ?? []) params.append('delivery_type[]', v)
    for (const v of filters?.cities ?? []) params.append('city[]', v)
    for (const v of filters?.dayParts ?? []) params.append('day_part[]', v)

    const response = await fetch(`${BACKEND_URL}/store/agenda?${params.toString()}`, {
      headers: storeHeaders(),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch agenda: ${response.status}`)
    }
    const data = await response.json()
    const items = (data.items ?? []).map((row: Record<string, unknown>) =>
      normalizeDocentenRow(row)
    ) as unknown as AgendaItem[]
    return {
      items,
      count: data.count ?? 0,
      facets: normalizeEventFacets(data.facets),
    }
  },

  async getCart(id: string): Promise<Cart | null> {
    try {
      const response = await medusa.store.cart.retrieve(id)
      return response.cart || null
    } catch (error) {
      return null
    }
  },

  async createCart(): Promise<Cart> {
    const response = await medusa.store.cart.create({})
    return response.cart
  },

  async addToCart(
    cartId: string,
    variantId: string,
    quantity: number
  ): Promise<Cart> {
    const response = await medusa.store.cart.createLineItem(cartId, {
      variant_id: variantId,
      quantity,
    })
    return response.cart
  },

  async updateCartItem(
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<Cart> {
    const response = await medusa.store.cart.updateLineItem(cartId, itemId, {
      quantity,
    })
    return response.cart
  },

  async removeFromCart(cartId: string, itemId: string): Promise<Cart> {
    const response = await medusa.store.cart.deleteLineItem(cartId, itemId)
    const cart = (response as { cart?: Cart; parent?: Cart }).parent ?? (response as { cart?: Cart }).cart
    if (!cart) throw new Error('Cart not returned after line item deletion')
    return cart
  },

  async applyPromoCodes(cartId: string, codes: string[]): Promise<Cart> {
    const response = await medusa.store.cart.update(cartId, { promo_codes: codes } as any)
    return response.cart
  },

  async removePromoCodes(cartId: string, codes: string[]): Promise<Cart> {
    const normalized = codes.map((c) => c.trim()).filter(Boolean)
    if (!normalized.length) {
      throw new Error('No promotion codes to remove')
    }
    const res = await storeFetch(`/store/carts/${cartId}/promotions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promo_codes: normalized }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message ?? 'Failed to remove promotion')
    }
    const data = await res.json()
    return data.cart as Cart
  },

  async applyCode(
    cartId: string,
    rawCode: string,
    currentPromoCodes: string[]
  ): Promise<{
    cart: Cart
    kind: 'promo' | 'gift_card'
    applied_amount?: number
    remaining_balance?: number
  }> {
    const normalized = rawCode.trim().toUpperCase()
    const promosUpper = currentPromoCodes.map((c) => c.trim().toUpperCase()).filter(Boolean)
    const tryGiftFirst = normalized.startsWith('GIFT-')

    const tryGift = async () => {
      const res = await storeFetch('/store/cart/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...storeHeaders() },
        body: JSON.stringify({ cart_id: cartId, code: normalized }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return {
        cart: data.cart as Cart,
        kind: 'gift_card' as const,
        applied_amount: data.applied_amount,
        remaining_balance: data.remaining_balance,
      }
    }

    const tryPromo = async (codes: string[]) => {
      try {
        const cart = await this.applyPromoCodes(cartId, codes)
        const applied = ((cart as any).promotions ?? []).map((p: any) =>
          String(p.code ?? '').toUpperCase()
        )
        if (applied.includes(normalized)) {
          return { cart, kind: 'promo' as const }
        }
      } catch {
        /* ignore */
      }
      return null
    }

    if (tryGiftFirst) {
      const g = await tryGift()
      if (g) return g
      const p = await tryPromo([...promosUpper, normalized])
      if (p) return p
      throw new Error('INVALID_CODE')
    }

    const p = await tryPromo([...promosUpper, normalized])
    if (p) return p
    const g = await tryGift()
    if (g) return g
    throw new Error('INVALID_CODE')
  },

  async removeGiftCardCode(cartId: string, code: string): Promise<Cart> {
    const res = await storeFetch('/store/cart/gift-cards', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...storeHeaders() },
      body: JSON.stringify({
        cart_id: cartId,
        code: code.trim().toUpperCase(),
      }),
    })
    if (!res.ok) {
      throw new Error('REMOVE_GIFT_FAILED')
    }
    const data = await res.json()
    return data.cart as Cart
  },

  async syncGiftCardCredits(cartId: string): Promise<Cart> {
    const res = await storeFetch('/store/cart/gift-cards/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...storeHeaders() },
      body: JSON.stringify({ cart_id: cartId }),
    })
    if (!res.ok) {
      throw new Error('SYNC_GIFT_FAILED')
    }
    const data = await res.json()
    return data.cart as Cart
  },

  async addGiftCardToCart(input: {
    cartId: string
    amountCents: number
    recipient_name: string
    recipient_email: string
    message?: string
    sender_name?: string
  }): Promise<Cart> {
    const res = await storeFetch('/store/gift-cards/add-to-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...storeHeaders() },
      body: JSON.stringify({
        cart_id: input.cartId,
        amount: input.amountCents,
        recipient_name: input.recipient_name,
        recipient_email: input.recipient_email,
        message: input.message,
        sender_name: input.sender_name,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).message || 'ADD_GIFT_CARD_FAILED')
    }
    const data = await res.json()
    return data.cart as Cart
  },

  async updateCart(cartId: string, input: CartUpdateInput): Promise<Cart> {
    const response = await medusa.store.cart.update(cartId, input as any)
    return response.cart
  },

  // Auth / customer

  async customerExists(email: string): Promise<boolean> {
    try {
      const res = await storeFetch(
        `/store/customer/exists?email=${encodeURIComponent(email)}`
      )
      if (!res.ok) return false
      const data = await res.json()
      return data.exists === true
    } catch {
      return false
    }
  },

  async login(email: string, password: string): Promise<Customer> {
    const result = await medusa.auth.login('customer', 'emailpass', { email, password })
    if (!result || typeof result === 'object' && 'location' in result) {
      throw new Error('Login failed: redirect received instead of token')
    }
    const retrieveCustomer = async (): Promise<Customer> => {
      const { customer } = await medusa.store.customer.retrieve()
      return customer as Customer
    }

    try {
      return await retrieveCustomer()
    } catch (e) {
      if (getFetchStatus(e) !== 401) throw e
    }

    // Stale JWT or missing customer_id on auth identity — see Medusa generateJwtTokenForAuthIdentity (empty actor_id → 401 on /customers/me).
    try {
      await medusa.auth.refresh()
      return await retrieveCustomer()
    } catch (e) {
      if (getFetchStatus(e) !== 401) throw e
    }

    await medusa.store.customer.create({ email })
    await medusa.auth.refresh()
    return await retrieveCustomer()
  },

  async logout(): Promise<void> {
    await medusa.auth.logout()
  },

  async getCustomer(): Promise<Customer | null> {
    return retrieveAuthenticatedCustomer()
  },

  async register(input: RegisterInput): Promise<Customer> {
    await medusa.auth.register('customer', 'emailpass', {
      email: input.email,
      password: input.password ?? '',
    })
    const result = await medusa.auth.login('customer', 'emailpass', {
      email: input.email,
      password: input.password ?? '',
    })
    if (!result || (typeof result === 'object' && 'location' in result)) {
      throw new Error('Registration succeeded but login failed')
    }
    await medusa.store.customer.create({
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      ...(input.phone ? { phone: input.phone } : {}),
    })
    if (input.address) {
      await storeFetch('/store/customers/me/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            first_name: input.first_name,
            last_name: input.last_name,
            ...(input.phone ? { phone: input.phone } : {}),
            address_1: input.address.address_1,
            postal_code: input.address.postal_code,
            city: input.address.city,
            country_code: input.address.country_code,
          },
        }),
      })
    }
    const { customer } = await medusa.store.customer.retrieve()
    return customer as Customer
  },

  async updateCustomerProfile(input: CustomerProfileUpdateInput): Promise<Customer> {
    const { customer } = await medusa.store.customer.update({
      first_name: input.first_name,
      last_name: input.last_name,
      ...(input.phone !== undefined ? { phone: input.phone || undefined } : {}),
    })
    return customer as Customer
  },

  async upsertCheckoutShippingAddress(
    input: CustomerCheckoutAddressInput
  ): Promise<Customer> {
    const listRes = await medusa.store.customer.listAddress({ limit: 50 })
    const addresses = listRes.addresses ?? []
    const payload = {
      first_name: input.first_name,
      last_name: input.last_name,
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      address_1: input.address_1,
      postal_code: input.postal_code,
      city: input.city,
      country_code: input.country_code.toLowerCase(),
      is_default_shipping: true,
    }
    const primary =
      addresses.find((a: Address) => a.is_default_shipping === true) ?? addresses[0]
    if (primary?.id) {
      const { customer } = await medusa.store.customer.updateAddress(primary.id, payload)
      return customer as Customer
    }
    const { customer } = await medusa.store.customer.createAddress(payload)
    return customer as Customer
  },

  async syncCartFromCustomer(customer: Customer, cartId: string): Promise<Cart> {
    const shipping = customerToShippingPayload(customer)
    if (!shipping) {
      throw new Error('CUSTOMER_PROFILE_INCOMPLETE')
    }
    const response = await medusa.store.cart.update(cartId, {
      email: customer.email,
      shipping_address: shipping,
    } as any)
    return response.cart
  },

  async getWishlistHandles(): Promise<string[]> {
    const c = await retrieveAuthenticatedCustomer()
    if (!c) return []
    return parseWishlistHandles(c.metadata)
  },

  async addWishlistHandle(handle: string): Promise<Customer> {
    const c = await retrieveAuthenticatedCustomer()
    if (!c) {
      throw new Error('WISHLIST_AUTH_REQUIRED')
    }
    const h = normalizeHandle(handle)
    if (!h) {
      return c
    }
    const current = parseWishlistHandles(c.metadata)
    const next = addHandleToList(current, h)
    const metadata = { ...(c.metadata ?? {}), [WISHLIST_METADATA_KEY]: next }
    const { customer } = await medusa.store.customer.update({ metadata })
    return customer as Customer
  },

  async removeWishlistHandle(handle: string): Promise<Customer> {
    const c = await retrieveAuthenticatedCustomer()
    if (!c) {
      throw new Error('WISHLIST_AUTH_REQUIRED')
    }
    const current = parseWishlistHandles(c.metadata)
    const next = removeHandleFromList(current, handle)
    const metadata = { ...(c.metadata ?? {}), [WISHLIST_METADATA_KEY]: next }
    const { customer } = await medusa.store.customer.update({ metadata })
    return customer as Customer
  },

  async recordRecentViewedHandle(handle: string): Promise<void> {
    const h = normalizeHandle(handle)
    if (!h) return

    const localNext = addRecentViewedHandle(getRecentViewedHandlesLocal(), h)
    setRecentViewedHandlesLocal(localNext)

    try {
      const c = await retrieveAuthenticatedCustomer()
      if (!c) return
      const metadata = {
        ...(c.metadata ?? {}),
        [RECENT_VIEWED_METADATA_KEY]: localNext,
      }
      await medusa.store.customer.update({ metadata })
    } catch {
      /* best-effort sync */
    }
  },

  // Payment

  async listPaymentProviders(regionId: string): Promise<PaymentProvider[]> {
    try {
      const params = new URLSearchParams({ region_id: regionId })
      const res = await storeFetch(`/store/payment-providers?${params}`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.payment_providers ?? []).filter((p: PaymentProvider) => p.is_enabled)
    } catch {
      return []
    }
  },

  async initiatePaymentSession(
    cartId: string,
    providerId: string
  ): Promise<PaymentSession> {
    // Step 1: Create a payment collection for the cart
    const collectionRes = await storeFetch('/store/payment-collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart_id: cartId }),
    })
    if (!collectionRes.ok) {
      const err = await collectionRes.json().catch(() => ({}))
      throw new Error((err as any).message ?? 'Failed to create payment collection')
    }
    const { payment_collection } = await collectionRes.json()

    // Step 2: Initiate a payment session on the collection
    const sessionRes = await storeFetch(
      `/store/payment-collections/${payment_collection.id}/payment-sessions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId }),
      }
    )
    if (!sessionRes.ok) {
      const err = await sessionRes.json().catch(() => ({}))
      throw new Error((err as any).message ?? 'Failed to initiate payment session')
    }
    const { payment_collection: updated } = await sessionRes.json()
    const session = updated?.payment_sessions?.[0]
    if (!session) throw new Error('No payment session returned')
    return session as PaymentSession
  },

  async completeCart(cartId: string): Promise<{ type: 'order'; order: Order } | { type: 'cart'; cart: Cart }> {
    const res = await storeFetch(`/store/carts/${cartId}/complete`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).message ?? 'Failed to complete cart')
    }
    return res.json()
  },

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const res = await storeFetch(`/store/orders/${orderId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.order ?? null
    } catch {
      return null
    }
  },

  async listCustomerOrders(options?: { limit?: number; offset?: number }): Promise<{
    orders: Order[]
    count: number
  }> {
    const limit = options?.limit ?? 20
    const offset = options?.offset ?? 0
    const { orders: rawOrders, count } = await medusa.store.order.list({
      limit,
      offset,
      fields: '*items',
    })
    const orders = (rawOrders ?? []).map((row: unknown) => mapStoreOrder(row))
    return { orders, count: typeof count === 'number' ? count : orders.length }
  },

  async changePassword(input: {
    email: string
    oldPassword: string
    newPassword: string
  }): Promise<void> {
    const result = await medusa.auth.login('customer', 'emailpass', {
      email: input.email,
      password: input.oldPassword,
    })
    if (!result || (typeof result === 'object' && 'location' in result)) {
      throw new Error('CHANGE_PASSWORD_LOGIN_FAILED')
    }
    const token = getStoredJwt()
    if (!token) {
      throw new Error('CHANGE_PASSWORD_NO_TOKEN')
    }
    await medusa.auth.updateProvider(
      'customer',
      'emailpass',
      { password: input.newPassword },
      token,
    )
  },
}
