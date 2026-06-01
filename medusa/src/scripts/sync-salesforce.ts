/**
 * Salesforce sync CLI — probe auth, push/pull one entity, or batch test.
 *
 *   npx medusa exec ./src/scripts/sync-salesforce.ts -- --probe
 *   npx medusa exec ./src/scripts/sync-salesforce.ts -- --probe --probe-verbose
 *   npx medusa exec ./src/scripts/sync-salesforce.ts -- --parse-sample
 *   SALESFORCE_DEBUG_HTTP=1 npx medusa exec ./src/scripts/sync-salesforce.ts -- --probe
 *   …
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { parseSampleQueryResponse } from "../modules/salesforce-sync/samples/run-parse-sample"
import { salesforceAuthMode } from "../modules/salesforce-sync/utils/is-configured"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import {
  pullWorkflowIdForEntity,
  pushWorkflowIdForEntity,
} from "../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function syncSalesforceScript({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (process.argv.includes("--parse-sample")) {
    parseSampleQueryResponse(logger)
    return
  }

  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  if (!(await sync.isIntegrationReady())) {
    logger.error(
      "[sync-salesforce] Not configured. JWT: CLIENT_ID + PRIVATE_KEY + USERNAME. " +
        "Refresh: CLIENT_ID + CLIENT_SECRET + (REFRESH_TOKEN env or Admin OAuth connect). See docs/SALESFORCE_SYNC.md."
    )
    return
  }

  if (process.argv.includes("--probe")) {
    logger.info(`[sync-salesforce] auth mode: ${salesforceAuthMode()}`)
    const q = await sync.query("SELECT Id, FirstName FROM Contact LIMIT 1")
    logger.info(`[sync-salesforce] probe OK, sample rows: ${q.records.length}`)
    if (process.argv.includes("--probe-verbose")) {
      const s = JSON.stringify(q, null, 2)
      logger.info(s.length > 12_000 ? `${s.slice(0, 12_000)}… (truncated)` : s)
    }
    return
  }

  const type = arg("--type") as
    | "customer"
    | "order"
    | "product"
    | "productgroup"
    | "variant"
    | undefined
  const action = arg("--action") as "push" | "pull" | undefined
  const id = arg("--id")
  const salesforceId = arg("--salesforce-id")
  const all = process.argv.includes("--all")
  const limit = Math.min(500, Math.max(1, Number(arg("--limit")) || 10))

  if (!type || !action) {
    logger.info(
      "[sync-salesforce] Usage: --type=customer|order|product|productgroup|variant --action=push|pull [--id=] [--salesforce-id=] [--all] [--limit=] | --probe [--probe-verbose] | --parse-sample\n" +
        "  product import: --type=product --action=pull --salesforce-id=<Product2 Id> (no --id)\n" +
        "  productgroup import: --type=productgroup --action=pull --salesforce-id=<vaProductgroup__c Id>"
    )
    return
  }

  if (action === "push" && id) {
    const wf = pushWorkflowIdForEntity(type)
    if (!wf) throw new Error("No push workflow")
    const input =
      type === "customer"
        ? { customerId: id }
        : type === "order"
          ? { orderId: id }
          : type === "product"
            ? { productId: id }
            : { variantId: id }
    await runSalesforceWorkflow(container, wf, input, { eventGroupId: id, entityType: type, medusaId: id })
    logger.info(`[sync-salesforce] push ${type} ${id} done`)
    return
  }

  if (action === "pull" && salesforceId) {
    const wf = pullWorkflowIdForEntity(type)
    if (!wf) throw new Error("No pull workflow for type (variant pull not supported)")

    if (type === "product" && !id) {
      const ret = await runSalesforceWorkflow(
        container,
        wf,
        { salesforceId },
        { eventGroupId: salesforceId, entityType: type, medusaId: salesforceId }
      )
      const result = ret.result as { medusaId?: string; created?: boolean } | undefined
      logger.info(
        `[sync-salesforce] import product ${result?.medusaId ?? "?"} from SF ${salesforceId} ` +
          `(created=${result?.created === true})`
      )
      return
    }

    if (type === "productgroup" && !id) {
      const ret = await runSalesforceWorkflow(
        container,
        wf,
        { salesforceId, manual: true },
        { eventGroupId: salesforceId, entityType: type, medusaId: salesforceId }
      )
      const result = ret.result as
        | { medusaId?: string; created?: boolean; skipped?: boolean; skipReason?: string }
        | undefined
      if (result?.skipped) {
        logger.info(
          `[sync-salesforce] productgroup import skipped (${result.skipReason ?? "skipped"}) for ${salesforceId}`
        )
        return
      }
      logger.info(
        `[sync-salesforce] import productgroup ${result?.medusaId ?? "?"} from SF ${salesforceId} ` +
          `(created=${result?.created === true})`
      )
      return
    }

    if (!id) {
      logger.info("[sync-salesforce] Provide --id for pull (except product import: --salesforce-id only)")
      return
    }

    await runSalesforceWorkflow(
      container,
      wf,
      { medusaId: id, salesforceId },
      { eventGroupId: id, entityType: type, medusaId: id }
    )
    logger.info(`[sync-salesforce] pull ${type} ${id} done`)
    return
  }

  if (action === "push" && all && type === "order") {
    const orderModule = container.resolve(Modules.ORDER)
    const orders = await orderModule.listOrders({}, { take: limit })
    for (const o of orders) {
      const wf = pushWorkflowIdForEntity("order")!
      await runSalesforceWorkflow(container, wf, { orderId: o.id }, {
        eventGroupId: o.id,
        entityType: "order",
        medusaId: o.id,
      })
      logger.info(`[sync-salesforce] pushed order ${o.id}`)
    }
    return
  }

  logger.info("[sync-salesforce] Provide --id (and --salesforce-id for pull), or --all with supported type")
}
