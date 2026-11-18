import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import type { EventCard } from '@/lib/commerce/types'
import type { CommerceItem, UserData } from '@/lib/analytics/types'

export type CheckoutConfirmationOrder = {
  id: string
  display_id?: number
  /** Salesforce Order.OrderNumber (storefront ordernummer). */
  salesforce_order_number?: string | null
  status?: string
  email?: string
  first_name?: string | null
  total: number
  subtotal: number
  discount_total?: number
  tax_total?: number
  tax_rate?: number
  created_at?: string
}

export type CheckoutConfirmationItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
  thumbnail?: string | null
  product_handle?: string | null
  is_vathuis?: boolean
  event_item: CartItemExtras['event_item']
  vathuis: CartItemExtras['vathuis']
  instructor_names: string[]
}

export type CheckoutConfirmationPayload = {
  status: 'ready' | 'pending' | 'failed'
  order: CheckoutConfirmationOrder | null
  items: CheckoutConfirmationItem[]
  notices: {
    show_offline: boolean
    show_online: boolean
  }
  primary_category?: { slug: string; label: string } | null
  vathuis_recommendations: EventCard[]
  /** HMAC token for revisiting the page: /bedankt?order={id}&token={view_token} */
  view_token?: string
  /** Same transaction_id / event_id as the server `purchase` (dedupe in GA4 / Meta). */
  purchase_analytics?: PurchaseAnalytics | null
}

export type PurchaseAnalytics = {
  transaction_id: string
  currency: string
  value: number
  tax: number
  shipping?: number
  coupon?: string
  payment_type?: string
  event_id?: string
  user_data?: UserData
  items: CommerceItem[]
}

export function salesforceOrderNumberFromConfirmation(
  confirmation: CheckoutConfirmationPayload | null | undefined,
): string | null {
  const n = confirmation?.order?.salesforce_order_number?.trim()
  return n || null
}
