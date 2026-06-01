import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { orderMapping } from "../../../modules/salesforce-sync/mappings/order"
import type { MedusaOrderShape } from "../../../modules/salesforce-sync/mappings/order"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

import type { PreparePushCustomerOutput } from "./prepare-push-customer-step"

export type PreparePushOrderInput = { orderId: string }

export type PreparePushOrderOutput = Omit<PreparePushCustomerOutput, "entityType" | "medusaId"> & {
  entityType: "order"
  medusaId: string
}

export const preparePushOrderStep = createStep(
  { name: "prepare-push-order", maxRetries: 2, retryInterval: 5 },
  async (input: PreparePushOrderInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const row = await sync.getStateByMedusaId("order", input.orderId)
    if (row?.incoming_lock_until && new Date(row.incoming_lock_until) > new Date()) {
      const out: PreparePushOrderOutput = {
        skipped: true,
        salesforceObject: "Order",
        externalIdField: orderMapping.externalIdField,
        externalId: input.orderId,
        fields: {},
        entityType: "order",
        medusaId: input.orderId,
      }
      return new StepResponse(out)
    }

    const orderModule = container.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(input.orderId, {
      relations: ["summary"],
    })

    const totalRaw = order.summary?.raw_current_order_total?.value ?? order.summary?.current_order_total
    const total = typeof totalRaw === "bigint" ? Number(totalRaw) : Number(totalRaw ?? 0)

    const o: MedusaOrderShape = {
      id: order.id,
      display_id: order.display_id,
      email: order.email,
      status: order.status,
      total,
      currency_code: order.currency_code,
    }

    const fields = orderMapping.toSalesforce(o) as Record<string, unknown>

    const out: PreparePushOrderOutput = {
      skipped: false,
      salesforceObject: "Order",
      externalIdField: orderMapping.externalIdField,
      externalId: input.orderId,
      fields,
      entityType: "order",
      medusaId: input.orderId,
    }
    return new StepResponse(out)
  }
)
