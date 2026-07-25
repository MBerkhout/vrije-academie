import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { completeOrderWorkflow } from "@medusajs/medusa/core-flows"

import { resolveOrderIdByDisplayId } from "../modules/salesforce-sync/utils/resolve-order-id-by-display-id"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function parseDisplayIdArg(): number | undefined {
  const raw = arg("--display-id") ?? arg("--order-nr")
  if (raw == null || raw === "") return undefined
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid display id: ${raw} (expected a positive integer)`)
  }
  return n
}

/**
 * Complete a pending order (emits order.completed).
 *
 *   npx medusa exec ./src/scripts/complete-order.ts -- --id=order_...
 *   npx medusa exec ./src/scripts/complete-order.ts -- --display-id=6
 */
export default async function completeOrderScript({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const id = arg("--id")
  const displayId = parseDisplayIdArg()

  if (id && displayId != null) {
    logger.error("[complete-order] Provide --id or --display-id/--order-nr, not both")
    return
  }

  let orderId = id
  if (displayId != null) {
    orderId = await resolveOrderIdByDisplayId(container, displayId)
    logger.info(`[complete-order] resolved display_id ${displayId} → ${orderId}`)
  }

  if (!orderId) {
    logger.info("[complete-order] Usage: --id=order_... | --display-id=N | --order-nr=N")
    return
  }

  await completeOrderWorkflow(container).run({ input: { orderIds: [orderId] } })
  logger.info(`[complete-order] completed ${orderId}`)
}
