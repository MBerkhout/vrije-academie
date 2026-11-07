import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { medusaOrderMoneyToCents } from "../../modules/salesforce-sync/utils/money"
import { mapOrderLinesToGtmItems } from "./map-order-line-items"
import { parseOrderAnalyticsMetadata } from "./parse-analytics-metadata"

export type GtmRefundPayload = {
  event: "refund"
  transaction_id: string
  currency: string
  value: number
  client_id?: string
  session_id?: string
  event_id?: string
  items: ReturnType<typeof mapOrderLinesToGtmItems>
}

function centsToEur(cents: number): number {
  return Math.round(cents) / 100
}

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export async function buildGtmRefundPayload(
  container: MedusaContainer,
  orderId: string
): Promise<GtmRefundPayload> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "currency_code",
      "total",
      "metadata",
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

  const itemsRaw = (order.items as Record<string, unknown>[]) ?? []
  const items = mapOrderLinesToGtmItems(itemsRaw)
  const totalCents = medusaOrderMoneyToCents(order.total)
  const attribution = parseOrderAnalyticsMetadata(
    (order.metadata ?? {}) as Record<string, unknown>
  )

  return {
    event: "refund",
    transaction_id: transactionId,
    currency: (nonEmpty(order.currency_code as string) ?? "EUR").toUpperCase(),
    value: centsToEur(totalCents),
    ...(attribution.client_id ? { client_id: attribution.client_id } : {}),
    ...(attribution.session_id ? { session_id: attribution.session_id } : {}),
    ...(attribution.event_id ? { event_id: `${attribution.event_id}-refund` } : {}),
    items,
  }
}
