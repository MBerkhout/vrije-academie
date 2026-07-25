import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { VATHUIS_ACCESS_MODULE } from "../modules/vathuis-access"
import type VathuisAccessModuleService from "../modules/vathuis-access/service"

/**
 * On order.completed: grant VA Thuis bundle access for 3 calendar months.
 */
export default async function vathuisAccessOrderCompleted({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const vathuisAccess = container.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >

  const orderId = data.id
  const order = await orderModule.retrieveOrder(orderId)
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
