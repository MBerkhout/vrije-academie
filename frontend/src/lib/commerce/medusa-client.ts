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
  RegisterPasswordlessInput,
  Variant,
  ProductFilters,
  EventFilters,
  PaginatedEventFilters,
  EventListResult,
  VathuisFilters,
  VathuisListResult,
  VathuisAccessItem,
  VathuisAccessStatus,
  VathuisPlaybackConfig,
  AgendaFilters,
  AgendaListResult,
  EventFacets,
  AgendaItem,
  SiteSearchHit,
  SearchSuggestionsResult,
  SearchSuggestion,
} from './types'
import {
  customerToShippingPayload,
  getDefaultCheckoutAddress,
  isCustomerProfileComplete,
} from './checkout-profile'
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
  mergeWishlistHandles,
  normalizeHandle,
  parseWishlistHandles,
  removeHandleFromList,
} from './wishlist'
import {
  normalizeBirthdateInput,
  SF_BIRTHDATE_METADATA_KEY,
} from './customer-birthdate'
import { sortCityFacetsByCount } from './city-facets'
import { filterFutureEventVariants } from '@/lib/event-status-presentation'
import { isGiftCardPurchaseLineItem } from './gift-card'
import {
  cartAggregateToStorefrontCents,
  lineUnitToStorefrontCents,
  medusaMajorToCents,
  normalizeStoreCart,
  parseMoney,
} from './normalize-store-money'

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

function mapSearchHit(hit: {
  kind: string
  title: string
  href: string
  subtitle?: string
  excerpt?: string
  thumbnailUrl?: string
}): SiteSearchHit | null {
  const title = hit.title?.trim()
  const href = hit.href?.trim()
  if (!title || !href) return null

  const kind =
    hit.kind === 'city'
      ? 'place'
      : (hit.kind as SiteSearchHit['kind'])

  if (
    kind !== 'page' &&
    kind !== 'product' &&
    kind !== 'docent' &&
    kind !== 'category' &&
    kind !== 'place' &&
    kind !== 'person'
  ) {
    return null
  }

  return {
    kind,
    title,
    href,
    subtitle: hit.subtitle,
    excerpt: hit.excerpt,
    thumbnailUrl: hit.thumbnailUrl,
  }
}

function mapSearchSuggestion(hit: {
  kind: string
  title: string
  href: string
  subtitle?: string
  thumbnailUrl?: string
}): SearchSuggestion | null {
  const title = hit.title?.trim()
  const href = hit.href?.trim()
  if (!title || !href) return null

  const kind = hit.kind === 'city' ? 'place' : hit.kind
  if (kind !== 'product' && kind !== 'category' && kind !== 'place' && kind !== 'page') {
    return null
  }

  return {
    kind,
    title,
    href,
    subtitle: hit.subtitle,
    thumbnailUrl: hit.thumbnailUrl,
  }
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

function setStoredJwt(token: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MEDUSA_JWT_STORAGE_KEY, token)
}

function mapStoreOrderItem(raw: unknown): OrderItem {
  const o = raw as Record<string, unknown>
  const isGiftcard = isGiftCardPurchaseLineItem({
    is_giftcard: o.is_giftcard as boolean | undefined,
    metadata: o.metadata as Record<string, unknown> | null | undefined,
  })
  const unit = lineUnitToStorefrontCents(o.unit_price, isGiftcard)
  const qty = typeof o.quantity === 'number' ? o.quantity : Number(o.quantity ?? 1)
  const rawTotal = parseMoney(o.total)
  const total =
    rawTotal > 0 ? (isGiftcard ? rawTotal : medusaMajorToCents(rawTotal)) : unit * qty
  return {
    id: String(o.id ?? ''),
    title: String(o.title ?? o.product_title ?? '—'),
    quantity: qty,
    unit_price: unit,
    total,
    thumbnail: (o.thumbnail as string | null | undefined) ?? null,
    variant: (o.variant as Variant | null | undefined) ?? null,
  }
}

function mapStoreOrder(raw: unknown): Order {
  const o = raw as Record<string, unknown>
  const items = Array.isArray(o.items) ? o.items.map(mapStoreOrderItem) : undefined
  const onlyGiftcardLines =
    items != null &&
    items.length > 0 &&
    items.every((_, i) => {
      const row = (o.items as unknown[])[i] as Record<string, unknown>
      return isGiftCardPurchaseLineItem({
        is_giftcard: row.is_giftcard as boolean | undefined,
        metadata: row.metadata as Record<string, unknown> | null | undefined,
      })
    })
  return {
    id: String(o.id ?? ''),
    display_id: typeof o.display_id === 'number' ? o.display_id : undefined,
    status: String(o.status ?? ''),
    email: o.email as string | undefined,
    total: onlyGiftcardLines ? parseMoney(o.total) : cartAggregateToStorefrontCents(o.total),
    subtotal: onlyGiftcardLines
      ? parseMoney(o.subtotal ?? o.total)
      : cartAggregateToStorefrontCents(o.subtotal ?? o.total),
    discount_total:
      o.discount_total !== undefined
        ? onlyGiftcardLines
          ? parseMoney(o.discount_total)
          : cartAggregateToStorefrontCents(o.discount_total)
        : undefined,
    tax_total:
      o.tax_total !== undefined
        ? onlyGiftcardLines
          ? parseMoney(o.tax_total)
          : cartAggregateToStorefrontCents(o.tax_total)
        : undefined,
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

async function enqueueSalesforceCustomerSync(email: string): Promise<void> {
  try {
    await storeFetch('/store/customer/me/sync-from-salesforce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch {
    /* non-blocking refresh from Salesforce */
  }
}

async function enqueueSalesforceCustomerPush(): Promise<void> {
  try {
    await storeFetch('/store/customer/me/push-to-salesforce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    /* non-blocking push to Salesforce */
  }
}

async function storeFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: { ...storeHeaders(), ...storeAuthHeaders(), ...(init?.headers ?? {}) },
  })
}

const CUSTOMER_RETRIEVE_FIELDS = '*addresses' as const

async function customerAfterToken(email?: string): Promise<Customer> {
  const retrieveCustomer = async (): Promise<Customer> => {
    const { customer } = await medusa.store.customer.retrieve({
      fields: CUSTOMER_RETRIEVE_FIELDS,
    })
    return customer as Customer
  }

  try {
    return await retrieveCustomer()
  } catch (e) {
    if (getFetchStatus(e) !== 401) throw e
  }

  try {
    await medusa.auth.refresh()
    return await retrieveCustomer()
  } catch (e) {
    if (getFetchStatus(e) !== 401) throw e
  }

  if (email) {
    await medusa.store.customer.create({ email })
    await medusa.auth.refresh()
    return await retrieveCustomer()
  }

  throw new Error('Could not load customer after authentication')
}

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

/** Mollie reads `context.customer.billing_address`, not cart shipping — keep them aligned before pay. */
async function ensureMollieBillingForPayment(cartId: string): Promise<void> {
  const customer = await retrieveAuthenticatedCustomer()
  if (customer && isCustomerProfileComplete(customer)) {
    const addr = getDefaultCheckoutAddress(customer)!
    const payload = {
      first_name: customer.first_name!.trim(),
      last_name: customer.last_name!.trim(),
      ...(customer.phone?.trim() ? { phone: customer.phone.trim() } : {}),
      address_1: addr.address_1!.trim(),
      postal_code: addr.postal_code!.trim(),
      city: addr.city!.trim(),
      country_code: (addr.country_code ?? 'nl').toLowerCase(),
    }
    const listRes = await medusa.store.customer.listAddress({ limit: 50 })
    const addresses = listRes.addresses ?? []
    const addressPayload = {
      ...payload,
      is_default_shipping: true,
      is_default_billing: true,
    }
    const primary =
      addresses.find((a: Address) => a.is_default_shipping === true) ?? addresses[0]
    if (primary?.id) {
      await medusa.store.customer.updateAddress(primary.id, addressPayload)
    } else {
      await medusa.store.customer.createAddress(addressPayload)
    }
    await medusa.store.cart.update(cartId, {
      email: customer.email,
      shipping_address: payload,
      billing_address: payload,
    } as any)
    return
  }

  try {
    const { cart: raw } = await medusa.store.cart.retrieve(cartId)
    const cart = normalizeStoreCart(raw)
    const shipping = cart.shipping_address
    if (!shipping?.postal_code?.trim()) return
    if (cart.billing_address?.postal_code?.trim()) return
    await medusa.store.cart.update(cartId, { billing_address: shipping } as any)
  } catch {
    /* non-blocking */
  }
}

async function prepareCheckout(cartId: string): Promise<void> {
  const res = await storeFetch(`/store/carts/${cartId}/prepare-checkout`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Failed to prepare checkout')
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
    const response = await fetch(
      `${BACKEND_URL}/store/events/${handle}`,
      { headers: storeHeaders() }
    )
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Failed to fetch event: ${response.status}`)
    }
    const data = await response.json()
    const ev = data.event
    if (!ev) return null
    const normalized = normalizeDocentenRow(ev as Record<string, unknown>) as unknown as EventCard
    const variants = filterFutureEventVariants(normalized.variants ?? [])
    return variants.length === (normalized.variants ?? []).length
      ? normalized
      : { ...normalized, variants }
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

  async getVathuisPaginated(filters?: VathuisFilters): Promise<VathuisListResult> {
    const params = new URLSearchParams()

    if (filters?.q) params.set('q', filters.q)
    if (filters?.sort) params.set('sort', filters.sort)
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.offset) params.set('offset', String(filters.offset))

    for (const v of filters?.categories ?? []) params.append('category', v)
    for (const v of filters?.teachers ?? []) params.append('docent', v)

    const response = await fetch(`${BACKEND_URL}/store/vathuis?${params.toString()}`, {
      headers: storeHeaders(),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch vathuis catalog: ${response.status}`)
    }
    const data = await response.json()
    const items = (data.items ?? []).map((e: Record<string, unknown>) =>
      normalizeDocentenRow(e)
    ) as unknown as EventCard[]
    return {
      items,
      count: data.count ?? 0,
      facets: normalizeEventFacets(data.facets),
    }
  },

  async getSimilarVathuis(handle: string): Promise<EventCard[]> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/store/vathuis/${encodeURIComponent(handle)}/similar`,
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
      return response.cart ? normalizeStoreCart(response.cart) : null
    } catch (error) {
      return null
    }
  },

  async createCart(): Promise<Cart> {
    const response = await medusa.store.cart.create({})
    return normalizeStoreCart(response.cart)
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
    return normalizeStoreCart(response.cart)
  },

  async updateCartItem(
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<Cart> {
    const response = await medusa.store.cart.updateLineItem(cartId, itemId, {
      quantity,
    })
    return normalizeStoreCart(response.cart)
  },

  async removeFromCart(cartId: string, itemId: string): Promise<Cart> {
    const response = await medusa.store.cart.deleteLineItem(cartId, itemId)
    const cart = (response as { cart?: Cart; parent?: Cart }).parent ?? (response as { cart?: Cart }).cart
    if (!cart) throw new Error('Cart not returned after line item deletion')
    return normalizeStoreCart(cart)
  },

  async applyPromoCodes(cartId: string, codes: string[]): Promise<Cart> {
    const response = await medusa.store.cart.update(cartId, { promo_codes: codes } as any)
    return normalizeStoreCart(response.cart)
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
    return normalizeStoreCart(data.cart)
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
        cart: normalizeStoreCart(data.cart),
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
    return normalizeStoreCart(data.cart)
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
    return normalizeStoreCart(data.cart)
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
    return normalizeStoreCart(data.cart)
  },

  async updateCart(cartId: string, input: CartUpdateInput): Promise<Cart> {
    const response = await medusa.store.cart.update(cartId, input as any)
    return normalizeStoreCart(response.cart)
  },

  // Auth / customer

  async customerExists(email: string): Promise<boolean> {
    const lookup = await this.customerLookup(email)
    return lookup.exists
  },

  async customerLookup(email: string): Promise<{ exists: boolean; hasPassword: boolean }> {
    const res = await storeFetch(
      `/store/customer/lookup?email=${encodeURIComponent(email)}`
    )
    if (!res.ok) {
      throw new Error('CUSTOMER_LOOKUP_FAILED')
    }
    const data = await res.json()
    return {
      exists: data.exists === true,
      hasPassword: data.hasPassword === true,
    }
  },

  async requestOtp(email: string, purpose: 'login' | 'set_password' = 'login'): Promise<void> {
    const res = await storeFetch('/store/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    })
    if (res.status === 429) {
      throw new Error('OTP_RATE_LIMIT')
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { message?: string }).message ?? 'OTP_REQUEST_FAILED')
    }
  },

  async verifyOtp(email: string, code: string): Promise<Customer> {
    const res = await storeFetch('/store/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, purpose: 'login' }),
    })
    if (!res.ok) {
      throw new Error('OTP_VERIFY_FAILED')
    }
    const data = await res.json()
    if (!data.token || typeof data.token !== 'string') {
      throw new Error('OTP_VERIFY_NO_TOKEN')
    }
    setStoredJwt(data.token)
    return customerAfterToken(email)
  },

  async registerPasswordless(input: RegisterPasswordlessInput): Promise<Customer> {
    const res = await storeFetch('/store/customer/register-passwordless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { message?: string }).message ?? 'REGISTER_FAILED')
    }
    const data = await res.json()
    if (!data.token || typeof data.token !== 'string') {
      throw new Error('REGISTER_NO_TOKEN')
    }
    setStoredJwt(data.token)
    return customerAfterToken(input.email)
  },

  async getAuthStatus(): Promise<{ hasPassword: boolean }> {
    const res = await storeFetch('/store/customer/me/auth-status')
    if (!res.ok) {
      throw new Error('AUTH_STATUS_FAILED')
    }
    const data = await res.json()
    return { hasPassword: data.hasPassword === true }
  },

  async login(email: string, password: string): Promise<Customer> {
    const res = await storeFetch('/store/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { message?: string }).message ?? 'LOGIN_FAILED')
    }
    const data = await res.json()
    if (!data.token || typeof data.token !== 'string') {
      throw new Error('LOGIN_NO_TOKEN')
    }
    setStoredJwt(data.token)
    const customer = await customerAfterToken(email)
    void enqueueSalesforceCustomerSync(email)
    return customer
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
    // Login JWT is issued before the customer row exists — refresh so actor_id is linked (same as login()).
    await medusa.auth.refresh()
    const birthdate = input.birthdate?.trim()
      ? normalizeBirthdateInput(input.birthdate)
      : ''
    if (birthdate) {
      await medusa.store.customer.update({
        metadata: { [SF_BIRTHDATE_METADATA_KEY]: birthdate },
      })
    }
    if (input.address) {
      await medusa.store.customer.createAddress({
        first_name: input.first_name,
        last_name: input.last_name,
        ...(input.phone ? { phone: input.phone } : {}),
        address_1: input.address.address_1,
        postal_code: input.address.postal_code,
        city: input.address.city,
        country_code: input.address.country_code.toLowerCase(),
        is_default_shipping: true,
      })
      void enqueueSalesforceCustomerPush()
    } else if (birthdate) {
      void enqueueSalesforceCustomerPush()
    }
    const customer = await customerAfterToken(input.email)
    void enqueueSalesforceCustomerSync(input.email)
    return customer
  },

  async updateCustomerProfile(input: CustomerProfileUpdateInput): Promise<Customer> {
    const current = await retrieveAuthenticatedCustomer()
    const metadata = { ...(current?.metadata ?? {}) }
    if (input.birthdate !== undefined) {
      const normalized = normalizeBirthdateInput(input.birthdate)
      if (normalized) metadata[SF_BIRTHDATE_METADATA_KEY] = normalized
      else delete metadata[SF_BIRTHDATE_METADATA_KEY]
    }
    const { customer } = await medusa.store.customer.update({
      first_name: input.first_name,
      last_name: input.last_name,
      ...(input.phone !== undefined ? { phone: input.phone || undefined } : {}),
      metadata,
    })
    void enqueueSalesforceCustomerPush()
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
      is_default_billing: true,
    }
    const primary =
      addresses.find((a: Address) => a.is_default_shipping === true) ?? addresses[0]
    if (primary?.id) {
      const { customer } = await medusa.store.customer.updateAddress(primary.id, payload)
      void enqueueSalesforceCustomerPush()
      return customer as Customer
    }
    const { customer } = await medusa.store.customer.createAddress(payload)
    void enqueueSalesforceCustomerPush()
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
      billing_address: shipping,
    } as any)
    return normalizeStoreCart(response.cart)
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

  async syncWishlistHandles(handles: string[]): Promise<Customer | null> {
    const c = await retrieveAuthenticatedCustomer()
    if (!c) return null
    const next = mergeWishlistHandles(handles, [])
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
    await prepareCheckout(cartId)
    await ensureMollieBillingForPayment(cartId)

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
    await prepareCheckout(cartId)
    const res = await storeFetch(`/store/carts/${cartId}/complete`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).message ?? 'Failed to complete cart')
    }
    const data = await res.json()
    if (data?.type === 'order' && data.order) {
      return { type: 'order' as const, order: mapStoreOrder(data.order) }
    }
    if (data?.cart) {
      return { ...data, cart: normalizeStoreCart(data.cart) }
    }
    return data
  },

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const res = await storeFetch(`/store/orders/${orderId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.order ? mapStoreOrder(data.order) : null
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

  async listVathuisAccess(): Promise<VathuisAccessItem[]> {
    const res = await storeFetch('/store/customer/me/vathuis-access')
    if (!res.ok) return []
    const data = (await res.json()) as { items?: VathuisAccessItem[] }
    return data.items ?? []
  },

  async getVathuisAccess(handle: string): Promise<VathuisAccessStatus> {
    const encoded = encodeURIComponent(handle)
    const res = await storeFetch(`/store/customer/me/vathuis-access/${encoded}`)
    if (!res.ok) {
      return { hasAccess: false, grantedAt: null, expiresAt: null }
    }
    return (await res.json()) as VathuisAccessStatus
  },

  async getVathuisEpisodePlayback(
    handle: string,
    episodeKey: string
  ): Promise<VathuisPlaybackConfig | null> {
    const encodedHandle = encodeURIComponent(handle)
    const encodedKey = encodeURIComponent(episodeKey)
    const res = await storeFetch(
      `/store/customer/me/vathuis-access/${encodedHandle}/episodes/${encodedKey}/embed`
    )
    if (!res.ok) return null
    const data = (await res.json()) as { playback?: VathuisPlaybackConfig }
    return data.playback ?? null
  },

  async getVathuisPreviewPlayback(
    handle: string,
    episodeKey: string
  ): Promise<VathuisPlaybackConfig | null> {
    const encodedHandle = encodeURIComponent(handle)
    const encodedKey = encodeURIComponent(episodeKey)
    const res = await fetch(
      `${BACKEND_URL}/store/events/${encodedHandle}/episodes/${encodedKey}/preview-playback`,
      {
        headers: PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {},
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { playback?: VathuisPlaybackConfig }
    return data.playback ?? null
  },

  async getVathuisEpisodeEmbed(handle: string, episodeKey: string): Promise<string | null> {
    const playback = await this.getVathuisEpisodePlayback(handle, episodeKey)
    if (!playback) return null
    return `https://embed.audienceplayer.com/${playback.projectId}/article/${playback.articleId}/asset/${playback.assetId}`
  },

  async searchSite(query: string): Promise<SiteSearchHit[]> {
    const q = query.trim()
    if (!q) return []

    const res = await fetch(
      `${BACKEND_URL}/store/search?${new URLSearchParams({ q, mode: 'full' })}`,
      {
        headers: PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {},
        next: { revalidate: 30 },
      }
    )

    if (!res.ok) return []

    const data = (await res.json()) as {
      hits?: Array<{
        kind: string
        title: string
        href: string
        subtitle?: string
        excerpt?: string
        thumbnailUrl?: string
      }>
    }

    return (data.hits ?? [])
      .map((hit) => mapSearchHit(hit))
      .filter((hit): hit is SiteSearchHit => hit !== null)
  },

  async searchSuggestions(query: string): Promise<SearchSuggestionsResult> {
    const q = query.trim()
    if (!q) {
      return { products: [], categories: [], places: [], pages: [] }
    }

    const res = await fetch(
      `${BACKEND_URL}/store/search?${new URLSearchParams({ q, mode: 'suggest' })}`,
      {
        headers: PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {},
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      return { products: [], categories: [], places: [], pages: [] }
    }

    const data = (await res.json()) as {
      products?: SearchSuggestion[]
      categories?: SearchSuggestion[]
      places?: SearchSuggestion[]
      pages?: SearchSuggestion[]
    }

    return {
      products: (data.products ?? []).map(mapSearchSuggestion).filter(Boolean) as SearchSuggestion[],
      categories: (data.categories ?? []).map(mapSearchSuggestion).filter(Boolean) as SearchSuggestion[],
      places: (data.places ?? []).map(mapSearchSuggestion).filter(Boolean) as SearchSuggestion[],
      pages: (data.pages ?? []).map(mapSearchSuggestion).filter(Boolean) as SearchSuggestion[],
    }
  },

  async setPassword(input: {
    newPassword: string
    oldPassword?: string
    otpCode?: string
  }): Promise<void> {
    const res = await storeFetch('/store/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      throw new Error('SET_PASSWORD_FAILED')
    }
  },

  async changePassword(input: {
    email: string
    oldPassword: string
    newPassword: string
  }): Promise<void> {
    await this.setPassword({
      newPassword: input.newPassword,
      oldPassword: input.oldPassword,
    })
  },
}
