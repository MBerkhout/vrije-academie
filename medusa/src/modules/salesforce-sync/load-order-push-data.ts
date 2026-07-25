import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import variantEventItemLink from "../../links/variant-event-item"
import { GIFT_CARD_MODULE } from "../../modules/gift-card"
import GiftCardModuleService from "../../modules/gift-card/service"
import { GIFT_CARD_REFERENCE } from "../../lib/gift-card-cart"
import { toNumber } from "../../lib/store-cart"
import { medusaOrderMoneyToCents } from "./utils/money"
import {
  buildOrderItemExternalId,
  buildRegistrationExternalId,
} from "./utils/build-registration-id"
import { resolveOrderPayment } from "./utils/resolve-order-payment"
import SalesforceSyncModuleService from "./service"
import { addCalendarMonths, toIsoString, parseIsoDate, VATHUIS_ACCESS_MONTHS } from "../../lib/vathuis-access-expiry"

const ENTITY_VARIANT = "variant"

export type OrderPushEventSeat = {
  lineItemId: string
  seatIndex: number
  registrationExternalId: string
  productLineExternalId: string
  discountLineExternalId: string | null
  variantId: string
  vaProductId: string
  product2Id: string
  unitPriceCents: number
  discountCents: number
  promotionCode: string | null
  productLabel: string
  productStartAt: string | null
  productEndAt: string | null
  productCity: string | null
  lineTotalCents: number
}

export type OrderPushGiftCardPurchase = {
  lineItemId: string
  externalId: string
  amountCents: number
  recipientName: string
  recipientEmail: string
  message: string | null
  giftCardId: string | null
  giftCardCode: string | null
}

export type OrderPushGiftCardRedemption = {
  creditLineId: string
  externalId: string
  amountCents: number
  giftCardId: string
  giftCardCode: string
  voucherSalesforceId: string | null
}

export type OrderPushPayload = {
  orderId: string
  displayId: number | null
  email: string | null
  customerId: string | null
  currencyCode: string
  totalCents: number
  createdAt: string
  billingAddress: {
    address_1?: string | null
    city?: string | null
    postal_code?: string | null
    country_code?: string | null
  } | null
  shippingAddress: {
    address_1?: string | null
    city?: string | null
    postal_code?: string | null
    country_code?: string | null
  } | null
  payment: { mollieTransactionId: string | null; paymentMethod: string }
  promotionCodes: string[]
  eventSeats: OrderPushEventSeat[]
  giftCardPurchases: OrderPushGiftCardPurchase[]
  giftCardRedemptions: OrderPushGiftCardRedemption[]
  existingSalesforceOrderId: string | null
}

function lineDiscountCents(item: Record<string, unknown>): number {
  const adjustments = item.adjustments as Array<{ amount?: unknown; promotion_id?: string }> | undefined
  if (!adjustments?.length) return 0
  return adjustments.reduce(
    (sum, adj) => sum + Math.abs(medusaOrderMoneyToCents(adj.amount)),
    0
  )
}

function isGiftCardLine(item: Record<string, unknown>): boolean {
  if (item.is_giftcard === true) return true
  const meta = item.metadata as { gift_card?: unknown } | null
  return !!meta?.gift_card
}

export async function loadOrderPushPayload(
  container: MedusaContainer,
  orderId: string
): Promise<OrderPushPayload> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "customer_id",
      "currency_code",
      "created_at",
      "total",
      "subtotal",
      "discount_total",
      "summary.raw_current_order_total",
      "summary.current_order_total",
      "billing_address.address_1",
      "billing_address.city",
      "billing_address.postal_code",
      "billing_address.country_code",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.postal_code",
      "shipping_address.country_code",
      "items.id",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.subtotal",
      "items.total",
      "items.variant_id",
      "items.metadata",
      "items.is_giftcard",
      "items.adjustments.amount",
      "items.adjustments.promotion_id",
      "credit_lines.id",
      "credit_lines.amount",
      "credit_lines.reference",
      "credit_lines.metadata",
      "promotions.code",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0] as Record<string, unknown> | undefined
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  const summary = order.summary as
    | { raw_current_order_total?: { value?: unknown }; current_order_total?: unknown }
    | undefined

  const promotions = (order.promotions as Array<{ code?: string }> | undefined) ?? []
  const promotionCodes = promotions.map((p) => p.code).filter((c): c is string => !!c)
  const promotionCode = promotionCodes[0] ?? null

  const syncRow = await sync.getStateByMedusaId("order", orderId)
  const items = (order.items as Record<string, unknown>[]) ?? []
  const eventSeats: OrderPushEventSeat[] = []

  for (const item of items) {
    if (isGiftCardLine(item)) continue
    const variantId = item.variant_id as string | undefined
    if (!variantId) continue

    const variantState = await sync.getStateByMedusaId(ENTITY_VARIANT, variantId)
    const vaProductId = variantState?.salesforce_id
    if (!vaProductId) {
      throw new Error(
        `Order line ${item.id} variant ${variantId} has no Salesforce vaProduct__c link — import product group first`
      )
    }

    const vaRow = await sync.retrieve("vaProduct__c", vaProductId, [
      "Id",
      "Name",
      "Product2__c",
      "Start_date_time__c",
      "End_date_time__c",
      "Product_City__c",
    ])
    const product2Id = vaRow.Product2__c as string | undefined
    if (!product2Id) {
      throw new Error(`vaProduct__c ${vaProductId} missing Product2__c`)
    }

    const { data: linkRows } = await query.graph({
      entity: variantEventItemLink.entryPoint,
      fields: ["event_item.start_at", "event_item.end_at", "event_item.city", "event_item.delivery_type"],
      filters: { product_variant_id: variantId },
    })
    const eventItem = (linkRows?.[0] as { event_item?: Record<string, unknown> } | undefined)
      ?.event_item

    const isPreRecorded = eventItem?.delivery_type === "pre_recorded"
    const orderCreatedAt = parseIsoDate(order.created_at as string) ?? new Date()
    const vathuisEndAt = addCalendarMonths(orderCreatedAt, VATHUIS_ACCESS_MONTHS)

    const qty = Math.max(1, toNumber(item.quantity))
    const unitPriceCents = medusaOrderMoneyToCents(item.unit_price)
    const discountTotal = lineDiscountCents(item)
    const discountPerSeat = qty > 0 ? Math.round(discountTotal / qty) : 0
    const productLabel =
      (item.title as string) || (vaRow.Name as string) || "Product"

    for (let seatIndex = 0; seatIndex < qty; seatIndex++) {
      const registrationExternalId = buildRegistrationExternalId(
        orderId,
        String(item.id),
        seatIndex
      )
      const productLineExternalId = buildOrderItemExternalId(
        orderId,
        String(item.id),
        "product",
        seatIndex
      )
      const discountLineExternalId =
        discountPerSeat > 0
          ? buildOrderItemExternalId(orderId, String(item.id), "discount", seatIndex)
          : null

      eventSeats.push({
        lineItemId: String(item.id),
        seatIndex,
        registrationExternalId,
        productLineExternalId,
        discountLineExternalId,
        variantId,
        vaProductId,
        product2Id,
        unitPriceCents,
        discountCents: discountPerSeat,
        promotionCode,
        productLabel,
        productStartAt: isPreRecorded
          ? toIsoString(orderCreatedAt)
          : ((eventItem?.start_at as string) ??
            (vaRow.Start_date_time__c as string) ??
            null),
        productEndAt: isPreRecorded
          ? toIsoString(vathuisEndAt)
          : ((eventItem?.end_at as string) ?? (vaRow.End_date_time__c as string) ?? null),
        productCity:
          (eventItem?.city as string) ?? (vaRow.Product_City__c as string) ?? null,
        lineTotalCents: Math.max(0, unitPriceCents - discountPerSeat),
      })
    }
  }

  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>
  const giftCardPurchases: OrderPushGiftCardPurchase[] = []

  for (const item of items) {
    if (!isGiftCardLine(item)) continue
    const meta = item.metadata as {
      gift_card?: {
        recipient_name?: string
        recipient_email?: string
        message?: string | null
        amount_cents?: number
      }
    } | null
    const gc = meta?.gift_card
    if (!gc?.recipient_email || !gc.recipient_name) continue

    const qty = Math.max(1, toNumber(item.quantity))
    const unitCents = medusaOrderMoneyToCents(item.unit_price)
    const amountCents =
      typeof gc.amount_cents === "number" ? gc.amount_cents : unitCents * qty

    const cards = await gift.listGiftCards({
      purchased_by_order_id: orderId,
      source_line_item_id: String(item.id),
    })
    const card = cards[0]

    giftCardPurchases.push({
      lineItemId: String(item.id),
      externalId: buildOrderItemExternalId(orderId, String(item.id), "giftcard_purchase"),
      amountCents,
      recipientName: gc.recipient_name,
      recipientEmail: gc.recipient_email,
      message: gc.message ?? null,
      giftCardId: card?.id ?? null,
      giftCardCode: card?.code ?? null,
    })
  }

  const creditLines = (order.credit_lines as Record<string, unknown>[]) ?? []
  const giftCardRedemptions: OrderPushGiftCardRedemption[] = []

  for (const cl of creditLines) {
    if (cl.reference !== GIFT_CARD_REFERENCE) continue
    const meta = cl.metadata as { gift_card_id?: string; code?: string } | null
    const amountCents = medusaOrderMoneyToCents(cl.amount)
    if (amountCents <= 0 || !meta?.gift_card_id) continue

    const cardRows = await gift.listGiftCards({ id: meta.gift_card_id })
    const card = cardRows[0] ?? null
    const code = card?.code ?? meta.code ?? ""
    let voucherSalesforceId: string | null = null
    const voucherState = await sync.getStateByMedusaId("voucher", meta.gift_card_id)
    voucherSalesforceId = voucherState?.salesforce_id ?? null

    giftCardRedemptions.push({
      creditLineId: String(cl.id),
      externalId: buildOrderItemExternalId(
        orderId,
        String(cl.id),
        "voucher_redemption"
      ),
      amountCents,
      giftCardId: meta.gift_card_id,
      giftCardCode: code,
      voucherSalesforceId,
    })
  }

  let totalCents = medusaOrderMoneyToCents(
    summary?.raw_current_order_total?.value ?? summary?.current_order_total ?? order.total
  )
  if (totalCents <= 0) {
    const seatsTotal = eventSeats.reduce((sum, seat) => sum + seat.lineTotalCents, 0)
    const giftTotal = giftCardPurchases.reduce((sum, row) => sum + row.amountCents, 0)
    const redemptionTotal = giftCardRedemptions.reduce((sum, row) => sum + row.amountCents, 0)
    const derived = seatsTotal + giftTotal - redemptionTotal
    if (derived > 0) totalCents = derived
  }

  const payment = await resolveOrderPayment(container, orderId, totalCents)

  return {
    orderId,
    displayId: (order.display_id as number) ?? null,
    email: (order.email as string) ?? null,
    customerId: (order.customer_id as string) ?? null,
    currencyCode: (order.currency_code as string) ?? "eur",
    totalCents,
    createdAt:
      order.created_at instanceof Date
        ? order.created_at.toISOString()
        : ((order.created_at as string) ?? new Date().toISOString()),
    billingAddress: (order.billing_address as OrderPushPayload["billingAddress"]) ?? null,
    shippingAddress: (order.shipping_address as OrderPushPayload["shippingAddress"]) ?? null,
    payment,
    promotionCodes,
    eventSeats,
    giftCardPurchases,
    giftCardRedemptions,
    existingSalesforceOrderId: syncRow?.salesforce_id ?? null,
  }
}
