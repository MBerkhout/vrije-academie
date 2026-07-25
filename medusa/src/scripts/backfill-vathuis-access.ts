/**
 * Backfill VA Thuis access entitlements from completed orders.
 *
 *   npx medusa exec ./src/scripts/backfill-vathuis-access.ts
 *   npx medusa exec ./src/scripts/backfill-vathuis-access.ts -- --dry-run
 *   npx medusa exec ./src/scripts/backfill-vathuis-access.ts -- --limit=100
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { VATHUIS_ACCESS_MODULE } from "../modules/vathuis-access"
import type VathuisAccessModuleService from "../modules/vathuis-access/service"

function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function backfillVathuisAccess({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const vathuisAccess = container.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >

  const dryRun = hasFlag("--dry-run")
  const limitRaw = arg("--limit")
  const limit = limitRaw ? Number(limitRaw) : undefined

  if (limitRaw && (!Number.isFinite(limit) || (limit as number) <= 0)) {
    logger.error("[backfill-vathuis-access] Invalid --limit value")
    return
  }

  const orders = await orderModule.listOrders(
    { status: "completed" },
    {
      take: limit ?? 10_000,
      order: { created_at: "ASC" },
      select: ["id", "status", "customer_id"],
    }
  )

  logger.info(
    `[backfill-vathuis-access] ${dryRun ? "DRY RUN — " : ""}processing ${orders.length} completed order(s)`
  )

  let grantedTotal = 0
  let processed = 0

  for (const order of orders) {
    processed += 1
    if (!order.customer_id) continue

    if (dryRun) {
      const lines = await vathuisAccess.listVathuisLinesForOrder(container, order.id)
      if (lines.length > 0) {
        logger.info(
          `[backfill-vathuis-access] would grant ${lines.length} entitlement(s) for order ${order.id}`
        )
        grantedTotal += lines.length
      }
      continue
    }

    const granted = await vathuisAccess.grantFromCompletedOrder(container, order.id)
    if (granted > 0) {
      logger.info(`[backfill-vathuis-access] granted ${granted} entitlement(s) for order ${order.id}`)
      grantedTotal += granted
    }
  }

  logger.info(
    `[backfill-vathuis-access] done — processed ${processed} order(s), ${grantedTotal} entitlement grant(s)`
  )
}
