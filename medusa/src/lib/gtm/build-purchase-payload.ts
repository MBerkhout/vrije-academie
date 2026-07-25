import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { medusaOrderMoneyToCents } from "../../modules/salesforce-sync/utils/money"

type GtmCommerceItem = {
  item_id: string
  item_name: string
  item_category?: string
  item_category2?: string
  item_variant?: string
  price: number
  quantity: number
}

export type GtmPurchasePayload = {
  event: "purchase"
  transaction_id: string
  currency: string
  value: number
  tax: number
  coupon?: string
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

function itemVariantFromEventItem(eventItem: Record<string, unknown> | null | undefined): string | undefined {
  if (!eventItem) return undefined
  let city = nonEmpty(eventItem.city)
  if (!city && eventItem.delivery_type === "online") city = "Online"
  const startAt = nonEmpty(eventItem.start_at as string | undefined)
  const parts = [city, startAt].filter(Boolean)
  return parts.length > 0 ? parts.join(" - ") : undefined
}

function categoryFromMetadata(metadata: Record<string, unknown> | null | undefined): string | undefined {
  const categories = metadata?.categories
  if (!Array.isArray(categories) || categories.length === 0) return undefined
  const first = categories[0] as { label?: string } | undefined
  return nonEmpty(first?.label)
}

function recordTypeFromMetadata(metadata: Record<string, unknown> | null | undefined): string | undefined {
  return (
    nonEmpty(metadata?.product_type as string | undefined) ??
    nonEmpty(metadata?.record_type as string | undefined)
  )
}

function isGiftCardLine(item: Record<string, unknown>): boolean {
  if (item.is_giftcard === true) return true
  const meta = item.metadata as { gift_card?: unknown } | null
  return !!meta?.gift_card
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
  const items: GtmCommerceItem[] = []

  for (const item of itemsRaw) {
    const qty = Math.max(1, Number(item.quantity) || 1)
    const unitCents = medusaOrderMoneyToCents(item.unit_price)

    if (isGiftCardLine(item)) {
      const meta = item.metadata as { gift_card?: { amount_cents?: number } } | null
      const priceCents = meta?.gift_card?.amount_cents ?? unitCents
      items.push({
        item_id: "cadeaubon",
        item_name: nonEmpty(item.title as string) ?? "Digitale cadeaubon",
        item_category: "Cadeaubon",
        price: centsToEur(priceCents),
        quantity: qty,
      })
      continue
    }

    const variant = item.variant as Record<string, unknown> | undefined
    const product = (variant?.product as Record<string, unknown> | undefined) ?? {}
    const metadata = product.metadata as Record<string, unknown> | null | undefined
    const eventItem = variant?.event_item as Record<string, unknown> | undefined

    const commerceItem: GtmCommerceItem = {
      item_id: nonEmpty(product.handle as string) ?? String(item.id),
      item_name: nonEmpty(product.title as string) ?? nonEmpty(item.title as string) ?? "Product",
      price: centsToEur(unitCents),
      quantity: qty,
    }

    const category = categoryFromMetadata(metadata)
    if (category) commerceItem.item_category = category
    const recordType = recordTypeFromMetadata(metadata)
    if (recordType) commerceItem.item_category2 = recordType
    const variantLabel = itemVariantFromEventItem(eventItem)
    if (variantLabel) commerceItem.item_variant = variantLabel

    items.push(commerceItem)
  }

  const totalCents = medusaOrderMoneyToCents(order.total)
  const taxCents = medusaOrderMoneyToCents(order.tax_total)

  return {
    event: "purchase",
    transaction_id: transactionId,
    currency: (nonEmpty(order.currency_code as string) ?? "EUR").toUpperCase(),
    value: centsToEur(totalCents),
    tax: centsToEur(taxCents),
    ...(manualCoupon ? { coupon: manualCoupon } : {}),
    user_data: userData,
    items,
  }
}

export async function hasGtmPurchaseBeenSent(
  container: MedusaContainer,
  orderId: string
): Promise<boolean> {
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, {
    select: ["id", "metadata"],
  })
  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  return Boolean(metadata.gtm_purchase_sent_at)
}

export async function markGtmPurchaseSent(
  container: MedusaContainer,
  orderId: string
): Promise<void> {
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, {
    select: ["id", "metadata"],
  })
  const metadata = (order.metadata ?? {}) as Record<string, unknown>

  await orderModule.updateOrders(orderId, {
    metadata: {
      ...metadata,
      gtm_purchase_sent_at: new Date().toISOString(),
    },
  })
}
