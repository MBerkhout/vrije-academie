import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { medusaOrderMoneyToCents } from "../../modules/salesforce-sync/utils/money"
import {
  GTM_PURCHASE_SENT_AT,
  hasOrderMetadataFlag,
  markOrderMetadataFlag,
} from "./idempotency"
import { mapOrderLinesToGtmItems, type GtmCommerceItem } from "./map-order-line-items"
import { parseOrderAnalyticsMetadata, type OrderAnalyticsAttribution } from "./parse-analytics-metadata"

export type { GtmCommerceItem }

export type GtmPurchasePayload = {
  event: "purchase"
  transaction_id: string
  currency: string
  value: number
  tax: number
  shipping?: number
  coupon?: string
  payment_type?: string
  page_location?: string
  client_id?: string
  session_id?: string
  event_id?: string
  fbp?: string
  fbc?: string
  gclid?: string
  ttclid?: string
  user_agent?: string
  user_data: {
    email?: string
    phone_number?: string
    first_name?: string
    last_name?: string
    postal_code?: string
    country?: string
  }
  items: GtmCommerceItem[]
}

function centsToEur(cents: number): number {
  return Math.round(cents) / 100
}

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function mergeAttribution(
  payload: GtmPurchasePayload,
  attribution: OrderAnalyticsAttribution
): GtmPurchasePayload {
  return {
    ...payload,
    ...(attribution.client_id ? { client_id: attribution.client_id } : {}),
    ...(attribution.session_id ? { session_id: attribution.session_id } : {}),
    ...(attribution.event_id ? { event_id: attribution.event_id } : {}),
    ...(attribution.fbp ? { fbp: attribution.fbp } : {}),
    ...(attribution.fbc ? { fbc: attribution.fbc } : {}),
    ...(attribution.gclid ? { gclid: attribution.gclid } : {}),
    ...(attribution.ttclid ? { ttclid: attribution.ttclid } : {}),
    ...(attribution.user_agent ? { user_agent: attribution.user_agent } : {}),
    ...(attribution.page_location ? { page_location: attribution.page_location } : {}),
    ...(attribution.payment_type ? { payment_type: attribution.payment_type } : {}),
  }
}

export async function buildGtmPurchasePayload(
  container: MedusaContainer,
  orderId: string
): Promise<GtmPurchasePayload> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "tax_total",
      "shipping_total",
      "discount_total",
      "metadata",
      "billing_address.first_name",
      "billing_address.last_name",
      "billing_address.phone",
      "billing_address.postal_code",
      "billing_address.country_code",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.phone",
      "shipping_address.postal_code",
      "shipping_address.country_code",
      "customer.first_name",
      "customer.last_name",
      "customer.phone",
      "customer.email",
      "items.id",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.metadata",
      "items.is_giftcard",
      "items.variant.product.handle",
      "items.variant.product.title",
      "items.variant.product.metadata",
      "items.variant.event_item.city",
      "items.variant.event_item.start_at",
      "items.variant.event_item.delivery_type",
      "promotions.code",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0] as Record<string, unknown> | undefined
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  const displayId = order.display_id as number | null | undefined
  const transactionId =
    displayId != null ? `VA-${displayId}` : String(order.id)

  const promotions = (order.promotions as Array<{ code?: string }> | undefined) ?? []
  const manualCoupon = promotions.find((p) => nonEmpty(p.code))?.code

  const billing = order.billing_address as Record<string, unknown> | null | undefined
  const shipping = order.shipping_address as Record<string, unknown> | null | undefined
  const customer = order.customer as Record<string, unknown> | null | undefined

  const userData: GtmPurchasePayload["user_data"] = {}
  const email = nonEmpty(order.email as string) ?? nonEmpty(customer?.email as string)
  if (email) userData.email = email
  const phone =
    nonEmpty(shipping?.phone as string) ??
    nonEmpty(billing?.phone as string) ??
    nonEmpty(customer?.phone as string)
  if (phone) userData.phone_number = phone
  const firstName =
    nonEmpty(shipping?.first_name as string) ??
    nonEmpty(billing?.first_name as string) ??
    nonEmpty(customer?.first_name as string)
  if (firstName) userData.first_name = firstName
  const lastName =
    nonEmpty(shipping?.last_name as string) ??
    nonEmpty(billing?.last_name as string) ??
    nonEmpty(customer?.last_name as string)
  if (lastName) userData.last_name = lastName
  const postal =
    nonEmpty(shipping?.postal_code as string) ?? nonEmpty(billing?.postal_code as string)
  if (postal) userData.postal_code = postal
  const country =
    nonEmpty(shipping?.country_code as string) ?? nonEmpty(billing?.country_code as string)
  if (country) userData.country = country.toUpperCase()

  const itemsRaw = (order.items as Record<string, unknown>[]) ?? []
  const items = mapOrderLinesToGtmItems(itemsRaw)

  const totalCents = medusaOrderMoneyToCents(order.total)
  const taxCents = medusaOrderMoneyToCents(order.tax_total)
  const shippingCents = medusaOrderMoneyToCents(order.shipping_total)

  const orderMetadata = (order.metadata ?? {}) as Record<string, unknown>
  const attribution = parseOrderAnalyticsMetadata(orderMetadata)

  const base: GtmPurchasePayload = {
    event: "purchase",
    transaction_id: transactionId,
    currency: (nonEmpty(order.currency_code as string) ?? "EUR").toUpperCase(),
    value: centsToEur(totalCents),
    tax: centsToEur(taxCents),
    ...(shippingCents > 0 ? { shipping: centsToEur(shippingCents) } : {}),
    ...(manualCoupon ? { coupon: manualCoupon } : {}),
    user_data: userData,
    items,
  }

  return mergeAttribution(base, attribution)
}

export async function hasGtmPurchaseBeenSent(
  container: MedusaContainer,
  orderId: string
): Promise<boolean> {
  return hasOrderMetadataFlag(container, orderId, GTM_PURCHASE_SENT_AT)
}

export async function markGtmPurchaseSent(
  container: MedusaContainer,
  orderId: string
): Promise<void> {
  return markOrderMetadataFlag(container, orderId, GTM_PURCHASE_SENT_AT)
}
