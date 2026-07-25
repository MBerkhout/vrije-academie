import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export async function resolveOrderIdByDisplayId(
  container: MedusaContainer,
  displayId: number
): Promise<string> {
  const orderModule = container.resolve(Modules.ORDER)
  const orders = await orderModule.listOrders(
    { display_id: displayId },
    { take: 2, select: ["id", "display_id", "status"] }
  )

  if (orders.length === 0) {
    throw new Error(`No order found with display_id ${displayId}`)
  }
  if (orders.length > 1) {
    throw new Error(`Multiple orders with display_id ${displayId}`)
  }

  return orders[0].id
}
