/**
 * Debug customer push — inspect recent customers and run prepare step.
 *   npx medusa exec ./src/scripts/debug-customer-push.ts [--id=cus_...]
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pushCustomerToSalesforceWorkflowId } from "../workflows/salesforce/push-customer-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function debugCustomerPush({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cs = container.resolve(Modules.CUSTOMER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const explicitId = arg("--id")?.trim()
  let customers: Array<{ id: string; email?: string | null; first_name?: string | null; last_name?: string | null; created_at?: string | Date }>

  if (explicitId) {
    customers = await cs.listCustomers({ id: explicitId }, { take: 1 })
  } else {
    customers = await cs.listCustomers({}, { take: 5, order: { created_at: "DESC" } })
  }

  logger.info(`[debug-customer-push] found ${customers.length} customer(s)`)

  for (const c of customers) {
    const state = await sync.getStateByMedusaId("customer", c.id)
    logger.info(
      `[debug-customer-push] ${c.id} | email=${JSON.stringify(c.email)} | ${c.first_name} ${c.last_name} | sync=${state?.salesforce_id ?? "none"} status=${state?.last_status ?? "none"} err=${state?.last_error ?? "none"}`
    )

    const ret = await runSalesforceWorkflow(
      container,
      pushCustomerToSalesforceWorkflowId,
      { customerId: c.id, isCreate: true },
      { eventGroupId: c.id, entityType: "customer", medusaId: c.id }
    )

    logger.info(
      `[debug-customer-push] workflow ${c.id}: hasFailed=${ret.hasFailed} thrown=${ret.thrownError?.message ?? "none"} errors=${JSON.stringify(ret.errors?.map((e) => String(e.error)))} result=${JSON.stringify(ret.result)}`
    )

    const after = await sync.getStateByMedusaId("customer", c.id)
    logger.info(
      `[debug-customer-push] after ${c.id}: sf=${after?.salesforce_id ?? "none"} pushed=${after?.last_pushed_at ?? "none"} status=${after?.last_status ?? "none"} err=${after?.last_error ?? "none"}`
    )
  }
}
