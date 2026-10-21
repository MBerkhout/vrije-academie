/**
 * Re-run VA Thuis entitlement grant for a completed order (e.g. after email/customer mismatch fix).
 *
 *   npx medusa exec ./src/scripts/repair-vathuis-access-for-order.ts -- --order-id=order_xxx
 */
import type { ExecArgs } from "@medusajs/framework/types"

import { VATHUIS_ACCESS_MODULE } from "../modules/vathuis-access"
import type VathuisAccessModuleService from "../modules/vathuis-access/service"

function readOrderId(): string {
  const flag = process.argv.find((arg) => arg.startsWith("--order-id="))
  const id = flag?.slice("--order-id=".length)?.trim()
  if (!id) {
    throw new Error("Pass --order-id=<medusa order id>")
  }
  return id
}

export default async function repairVathuisAccessForOrder({ container }: ExecArgs) {
  const orderId = readOrderId()
  const vathuisAccess = container.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >
  const granted = await vathuisAccess.grantFromCompletedOrder(container, orderId)
  console.log(`[repair-vathuis-access] order ${orderId}: ${granted} line(s) granted/reassigned`)
}
