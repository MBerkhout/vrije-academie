/**
 * Commerce-agnostic types for e-commerce
 * These types abstract away Medusa-specific implementation
 */

export interface Product {
  id: string
  title: string
  description?: string
  handle: string
  images: Image[]
  variants: Variant[]
  metadata?: Record<string, any>
}

export interface Variant {
  id: string
  title: string
  price: number // Price in cents
  inventory_quantity: number
  sku?: string
}

export interface Image {
  id: string
  url: string
  alt?: string
}

export interface Event extends Product {
  metadata: EventMetadata
}

export interface EventMetadata {
  eventType: 'online' | 'offline'
  startDate: string // ISO 8601
  endDate: string // ISO 8601
  location: {
    online?: {
      url: string
      platform: string
    }
    offline?: {
      address: string
      venue: string
      city: string
      postalCode: string
    }
  }
  capacity: number
  instructor?: string
  category?: string
}

/** Card-ready shape returned by /store/events */
export interface EventCard {
  id: string
  handle: string
  title: string
  description?: string | null
  thumbnail?: string | null
  image_urls?: string[]
  record_type?: string | null
  /** Medusa product type label from Salesforce `Productgroup_Record_Type_Developer_Name__c`. */
  product_type?: string | null
  tags?: { id: string; value: string }[]
  categories?: { id: string; slug: string; label: string }[]
  instructors?: { id: string; slug: string; name: string; photo_url?: string | null }[]
  teachers?: { id: string; slug: string; name: string }[]
  cities?: string[]
  delivery_types?: string[]
  earliest_start_at?: string | null
  day_part_of_earliest?: string | null
  price_from?: number | null
  min_available_quantity?: number | null
  has_free_trial?: boolean
  badge?: string | null
  /** When set (e.g. reizen), Direct inschrijven opens this external purchase URL instead of cart. */
  external_registration_url?: string | null
  /** When `bundle_only`, only `bundle_variant_id` may be added to cart (VAthuis). */
  purchase_mode?: 'bundle_only' | string | null
  bundle_variant_id?: string | null
  vathuis?: VathuisBundleInfo | null
  variants?: EventVariant[]
}

export interface VathuisEpisode {
  number: number
  title: string
  description?: string | null
  duration_seconds?: number | null
  duration_label?: string | null
  audience_article_id?: number
  audience_asset_id?: number | null
  preview_available?: boolean
  embed_url?: string | null
  chapter_number?: number
}

export interface VathuisChapter {
  number: number
  title: string
  episodes: VathuisEpisode[]
}

export interface VathuisBundleInfo {
  episode_count_label?: string | null
  play_time?: string | null
  episodes?: VathuisEpisode[]
  chapters?: VathuisChapter[]
  audience_player?: {
    project_id?: number | null
    preview_url?: string | null
    iframe_url?: string | null
  } | null
}

export interface EventVariant {
  id: string
  title: string
  prices?: { amount: number; currency_code: string }[]
  /** False for non-bundle rows on VAthuis products. */
  purchasable?: boolean
  event_item?: {
    id: string
    delivery_type: string
    available_quantity: number
    start_at?: string | null
    end_at?: string | null
    city?: string | null
    registration_deadline_at?: string | null
    is_free_trial: boolean
  } | null
}

export interface EventListResult {
  events: EventCard[]
  count: number
  facets: EventFacets
}

/**
 * One scheduled occurrence (one `event_item`) for the Agenda view.
 * Derived button state is precomputed in the API as `status`.
 */
export interface AgendaItem {
  id: string
  variant_id: string
  product_id: string
  product_handle: string
  product_title: string
  thumbnail?: string | null
  record_type?: string | null
  categories?: { id: string; slug: string; label: string }[]
  teachers?: { id: string; slug: string; name: string }[]
  tags?: { id: string; value: string }[]
  has_exclusief_tag?: boolean
  variant_title?: string | null
  delivery_type: 'online' | 'offline' | 'pre_recorded' | string
  city?: string | null
  start_at?: string | null
  end_at?: string | null
  available_quantity: number
  is_free_trial?: boolean
  registration_deadline_at?: string | null
  price?: number | null
  day_part?: 'ochtend' | 'middag' | 'avond' | null
  status: 'open' | 'almost_full' | 'waitlist' | 'exclusief'
}

export interface AgendaListResult {
  items: AgendaItem[]
  count: number
  facets: EventFacets
}

export interface AgendaFilters {
  q?: string
  categories?: string[]
  teachers?: string[]
  recordTypes?: string[]
  productTypes?: string[]
  deliveryTypes?: string[]
  cities?: string[]
  dayParts?: string[]
  periodStart?: string
  periodEnd?: string
  /** YYYY-MM-DD, single-day filter (mutually useful with period) */
  date?: string
  includePast?: boolean
  sort?: 'start_date' | 'start_date_desc' | 'price_asc' | 'price_desc'
  limit?: number
  offset?: number
}

export interface EventFacets {
  record_type: { slug: string; count: number }[]
  product_type: { slug: string; label: string; count: number }[]
  categories: { slug: string; label: string; count: number }[]
  teachers: { slug: string; name: string; count: number }[]
  cities: { slug: string; label: string; count: number }[]
  delivery_type: { slug: string; count: number }[]
  day_part: { slug: string; count: number }[]
}

export interface Cart {
  id: string
  items: CartItem[]
  email?: string | null
  region_id?: string | null
  subtotal: number
  discount_total: number
  tax_total: number
  total: number
  /** Store API: promotion applications on the cart */
  promotions?: { code?: string; id?: string; is_automatic?: boolean }[] | null
  metadata?: Record<string, unknown> | null
  /** Amount covered by cart credit lines (e.g. gift cards), minor units */
  credit_line_total?: number
  shipping_address?: Address | null
  billing_address?: Address | null
  payment_collection?: {
    payment_sessions?: PaymentSession[]
  } | null
}

export interface CartItem {
  id: string
  /** Medusa line item; used for stable cart display order. */
  created_at?: string
  createdAt?: string
  variant_id: string
  quantity: number
  unit_price: number
  subtotal: number
  total: number
  title: string
  variant: Variant
  thumbnail?: string | null
  is_giftcard?: boolean
  metadata?: Record<string, unknown> | null
}

export interface Address {
  id?: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address_1?: string | null
  address_2?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
  is_default_shipping?: boolean | null
}

export interface Customer {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  has_account?: boolean
  addresses?: Address[]
  /** Medusa JSON column; `va_wishlist` stores product `handle[]` for the wishlist. */
  metadata?: Record<string, unknown> | null
}

/** Logged-in checkout: update Medusa customer row (not shipping lines). */
export interface CustomerProfileUpdateInput {
  first_name: string
  last_name: string
  phone?: string
}

/** Logged-in checkout: create/update one canonical customer address. */
export interface CustomerCheckoutAddressInput {
  first_name: string
  last_name: string
  phone?: string
  address_1: string
  postal_code: string
  city: string
  country_code: string
}

export interface PaymentMethod {
  id: string
  name: string
  imageUrl: string
}

/** A Medusa payment provider (one per Mollie method, e.g. pp_mollie-ideal_mollie) */
export interface PaymentProvider {
  id: string
  is_enabled: boolean
}

export interface PaymentSession {
  id: string
  provider_id: string
  status: string
  data: Record<string, unknown>
}

export interface Order {
  id: string
  display_id?: number
  status: string
  email?: string
  total: number
  subtotal: number
  discount_total?: number
  tax_total?: number
  currency_code?: string
  items?: OrderItem[]
  payment_status?: string
  created_at?: string
}

export interface OrderItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
  thumbnail?: string | null
  variant?: Variant | null
}

/**
 * Commerce Client Interface
 * Implementations (Medusa, Shopify, etc.) must conform to this interface
 */
export interface CommerceClient {
  getProducts(filters?: ProductFilters): Promise<Product[]>
  getProduct(handle: string): Promise<Product | null>
  getEvents(filters?: EventFilters): Promise<EventCard[]>
  getEvent(handle: string): Promise<EventCard | null>
  getSimilarEvents(handle: string): Promise<EventCard[]>
  getEventsPaginated(filters?: PaginatedEventFilters): Promise<EventListResult>
  getAgendaPaginated(filters?: AgendaFilters): Promise<AgendaListResult>
  getCart(id: string): Promise<Cart | null>
  createCart(): Promise<Cart>
  addToCart(cartId: string, variantId: string, quantity: number): Promise<Cart>
  updateCartItem(cartId: string, itemId: string, quantity: number): Promise<Cart>
  removeFromCart(cartId: string, itemId: string): Promise<Cart>
  applyPromoCodes(cartId: string, codes: string[]): Promise<Cart>
  /** Remove one or more promotion codes from the cart (store promotions DELETE). */
  removePromoCodes(cartId: string, codes: string[]): Promise<Cart>
  /**
   * Apply a single kortingscode or balance-backed cadeaubon code.
   * Tries GIFT-* as gift card first; otherwise promo first, then gift fallback.
   */
  applyCode(
    cartId: string,
    code: string,
    currentPromoCodes: string[]
  ): Promise<{ cart: Cart; kind: "promo" | "gift_card"; applied_amount?: number; remaining_balance?: number }>
  removeGiftCardCode(cartId: string, code: string): Promise<Cart>
  /** Re-apply saved gift cards after cart line items or promos change */
  syncGiftCardCredits(cartId: string): Promise<Cart>
  addGiftCardToCart(input: {
    cartId: string
    amountCents: number
    recipient_name: string
    recipient_email: string
    message?: string
    sender_name?: string
  }): Promise<Cart>
  updateCart(cartId: string, input: CartUpdateInput): Promise<Cart>
  // Auth / customer
  customerExists(email: string): Promise<boolean>
  login(email: string, password: string): Promise<Customer>
  logout(): Promise<void>
  getCustomer(): Promise<Customer | null>
  register(input: RegisterInput): Promise<Customer>
  /** Store API: logged-in customer name/phone. */
  updateCustomerProfile(input: CustomerProfileUpdateInput): Promise<Customer>
  /** Store API: create or update default checkout address on the customer. */
  upsertCheckoutShippingAddress(input: CustomerCheckoutAddressInput): Promise<Customer>
  /** Copy customer profile + default address onto the cart for payment. */
  syncCartFromCustomer(customer: Customer, cartId: string): Promise<Cart>
  /** Logged-in: wishlist as product handles from customer.metadata. */
  getWishlistHandles(): Promise<string[]>
  /** Logged-in: add handle (prepended); merges full metadata. Throws if not authenticated. */
  addWishlistHandle(handle: string): Promise<Customer>
  /** Logged-in: remove handle; merges full metadata. Throws if not authenticated. */
  removeWishlistHandle(handle: string): Promise<Customer>
  /** Record a PDP view (localStorage; syncs to customer.metadata when logged in). */
  recordRecentViewedHandle(handle: string): Promise<void>
  // Checkout / payment
  listPaymentProviders(regionId: string): Promise<PaymentProvider[]>
  initiatePaymentSession(cartId: string, providerId: string): Promise<PaymentSession>
  completeCart(cartId: string): Promise<{ type: 'order'; order: Order } | { type: 'cart'; cart: Cart }>
  getOrder(orderId: string): Promise<Order | null>
  /** Logged-in customer orders (store API). */
  listCustomerOrders(options?: { limit?: number; offset?: number }): Promise<{ orders: Order[]; count: number }>
  /** Validate current password via login, then set new password (emailpass). */
  changePassword(input: {
    email: string
    oldPassword: string
    newPassword: string
  }): Promise<void>
}

export interface CartUpdateInput {
  email?: string
  shipping_address?: Partial<Address>
  billing_address?: Partial<Address>
  promo_codes?: string[]
}

export interface ProductFilters {
  category?: string
  limit?: number
}

export interface EventFilters {
  category?: string
  eventType?: 'online' | 'offline' | 'all'
  limit?: number
  showPastEvents?: boolean
}

export interface PaginatedEventFilters {
  q?: string
  categories?: string[]
  teachers?: string[]
  recordTypes?: string[]
  productTypes?: string[]
  deliveryTypes?: string[]
  cities?: string[]
  dayParts?: string[]
  periodStart?: string
  periodEnd?: string
  sort?: 'start_date' | 'newest' | 'relevance' | 'price_asc' | 'price_desc' | 'popularity'
  limit?: number
  offset?: number
}

export interface RegisterInput {
  email: string
  password?: string
  first_name: string
  last_name: string
  phone?: string
  address?: {
    address_1: string
    postal_code: string
    city: string
    country_code: string
  }
}
