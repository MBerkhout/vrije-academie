import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { loadOrderPushPayload, type OrderPushPayload } from "../../../modules/salesforce-sync/load-order-push-data"
import { orderHeaderToSalesforce } from "../../../modules/salesforce-sync/mappings/order"
import { SALESFORCE_DEFAULT_PRICEBOOK2_ID } from "../../../modules/salesforce-sync/utils/salesforce-config"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

export type PreparePushOrderInput = { orderId: string }

export type PreparePushOrderOutput = {
  skipped: boolean
  skipReason?: string
  entityType: "order"
  medusaId: string
  payload: OrderPushPayload | null
  orderHeader: Record<string, unknown>
  customerId: string | null
}

export const preparePushOrderStep = createStep(
  { name: "prepare-push-order", maxRetries: 2, retryInterval: 5 },
  async (input: PreparePushOrderInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const row = await sync.getStateByMedusaId("order", input.orderId)
    if (row?.incoming_lock_until && new Date(row.incoming_lock_until) > new Date()) {
      const out: PreparePushOrderOutput = {
        skipped: true,
        skipReason: "incoming_lock",
        entityType: "order",
        medusaId: input.orderId,
        payload: null,
        orderHeader: {},
        customerId: null,
      }
      return new StepResponse(out)
    }

    const orderModule = container.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(input.orderId)
    if (order.status !== "completed") {
      const out: PreparePushOrderOutput = {
        skipped: true,
        skipReason: `status_${order.status}`,
        entityType: "order",
        medusaId: input.orderId,
        payload: null,
        orderHeader: {},
        customerId: null,
      }
      return new StepResponse(out)
    }

    const payload = await loadOrderPushPayload(container, input.orderId)
    const orderHeader = orderHeaderToSalesforce({
      id: payload.orderId,
      display_id: payload.displayId,
      email: payload.email,
      status: "completed",
      total_cents: payload.totalCents,
      currency_code: payload.currencyCode,
      effective_date: payload.createdAt,
      payment_method: payload.payment.paymentMethod,
      mollie_transaction_id: payload.payment.mollieTransactionId,
      billing_address: payload.billingAddress,
      shipping_address: payload.shippingAddress,
      pricebook2_id: SALESFORCE_DEFAULT_PRICEBOOK2_ID,
      for_update: !!payload.existingSalesforceOrderId,
    }) as Record<string, unknown>

    const out: PreparePushOrderOutput = {
      skipped: false,
      entityType: "order",
      medusaId: input.orderId,
      payload,
      orderHeader,
      customerId: payload.customerId,
    }
    return new StepResponse(out)
  }
)
