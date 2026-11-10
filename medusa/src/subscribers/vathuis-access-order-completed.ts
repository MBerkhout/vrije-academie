import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { sentrySubscriber } from "../lib/subscriber-sentry"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { isImportedSalesforceOrder } from "../modules/salesforce-sync/utils/order-import-metadata"
import { VATHUIS_ACCESS_MODULE } from "../modules/vathuis-access"
import type VathuisAccessModuleService from "../modules/vathuis-access/service"

/**
 * On order.completed: grant VA Thuis bundle access for 3 calendar months.
 */
async function vathuisAccessOrderCompleted({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const vathuisAccess = container.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >

  const orderId = data.id
  const order = await orderModule.retrieveOrder(orderId, { select: ["id", "status", "metadata"] })
  if (isImportedSalesforceOrder(order.metadata as Record<string, unknown> | null)) {
    logger.info(`[vathuis-access] skip imported Salesforce order ${orderId}`)
    return
  }
  if (order.status !== "completed") {
    logger.info(`[vathuis-access] skip order ${orderId} status=${order.status}`)
    return
  }

  const granted = await vathuisAccess.grantFromCompletedOrder(container, orderId)
  if (granted > 0) {
    logger.info(`[vathuis-access] granted ${granted} entitlement(s) for order ${orderId}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.completed",
}

export default sentrySubscriber("vathuis-access-order-completed", vathuisAccessOrderCompleted)
