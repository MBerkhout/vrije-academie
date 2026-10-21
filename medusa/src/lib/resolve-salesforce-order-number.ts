import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  ORDER_SALESFORCE_ORDER_NUMBER,
  salesforceOrderNumberFromMetadata,
} from "../modules/salesforce-sync/utils/order-import-metadata"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { SF_ORDER_OBJECT } from "../modules/salesforce-sync/utils/salesforce-config"

function normalizeOrderNumber(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

export type ResolveSalesforceOrderNumberInput = {
  orderId: string
  metadata?: Record<string, unknown> | null
  /** When known (e.g. right after SF push), skip sync-state lookup. */
  salesforceOrderId?: string | null
}

/**
 * Returns Salesforce OrderNumber for a Medusa order, persisting it on order metadata when fetched.
 */
export async function resolveSalesforceOrderNumber(
  container: MedusaContainer,
  input: ResolveSalesforceOrderNumberInput
): Promise<string | null> {
  const fromMeta = salesforceOrderNumberFromMetadata(input.metadata)
  if (fromMeta) return fromMeta

  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) return null

  const salesforceId =
    input.salesforceOrderId?.trim() ||
    (await sync.getStateByMedusaId("order", input.orderId))?.salesforce_id?.trim() ||
    null
  if (!salesforceId) return null

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const sfOrder = await sync.retrieve(SF_ORDER_OBJECT, salesforceId, ["OrderNumber"])
    const orderNumber = normalizeOrderNumber(sfOrder.OrderNumber)
    if (!orderNumber) return null

    const orderModule = container.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(input.orderId, { select: ["id", "metadata"] })
    const merged = {
      ...((order.metadata ?? {}) as Record<string, unknown>),
      [ORDER_SALESFORCE_ORDER_NUMBER]: orderNumber,
    }
    await orderModule.updateOrders(input.orderId, { metadata: merged })
    return orderNumber
  } catch (err) {
    logger.warn(
      `[salesforce] resolve OrderNumber for order ${input.orderId} (sf ${salesforceId}): ${err instanceof Error ? err.message : String(err)}`
    )
    return null
  }
}
