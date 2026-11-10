import type { MedusaContainer } from "@medusajs/framework/types"

import SalesforceSyncModuleService from "../../modules/salesforce-sync/service"
import { reportSalesforceFailure } from "./report-failure"

/**
 * Redis-engine workflows retry steps in the background, so `runSalesforceWorkflow` returns
 * before the outcome is known. Each failed attempt records its error on the sync-state row
 * (status "retrying"); once retries are exhausted `reportOrderPushTerminalFailure` flips it to "error".
 */
export async function recordPushAttemptFailure(
  container: MedusaContainer,
  entityType: string,
  medusaId: string,
  err: unknown
): Promise<void> {
  try {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const message = err instanceof Error ? err.message : String(err)
    const row = await sync.getStateByMedusaId(entityType, medusaId)
    if (!row) {
      await sync.createSalesforceSyncStates([
        {
          entity_type: entityType,
          medusa_id: medusaId,
          last_status: "retrying",
          last_error: message,
          severity: "error",
        },
      ])
      return
    }
    await sync.updateSalesforceSyncStates({
      id: row.id,
      last_status: "retrying",
      last_error: message,
      severity: "error",
    })
  } catch {
    // never mask the original step error
  }
}

/** Wrap a step handler so every thrown error is recorded on the sync-state row. */
export function trackPushFailure<I, O>(
  entityType: string,
  getMedusaId: (input: I) => string | null | undefined,
  handler: (input: I, ctx: { container: MedusaContainer }) => Promise<O>
) {
  return async (input: I, ctx: { container: MedusaContainer }): Promise<O> => {
    try {
      return await handler(input, ctx)
    } catch (err) {
      const id = getMedusaId(input)
      if (id) await recordPushAttemptFailure(ctx.container, entityType, id, err)
      throw err
    }
  }
}

/** Compensation hook: runs when the workflow fails for good; marks the row "error" and alerts. */
export async function reportPushTerminalFailure(
  container: MedusaContainer,
  entityType: string,
  medusaId: string,
  workflowId: string
): Promise<void> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const row = await sync.getStateByMedusaId(entityType, medusaId)
  if (!row || row.last_status !== "retrying" || !row.last_error) return
  await reportSalesforceFailure(container, {
    entityType,
    medusaId,
    salesforceId: row.salesforce_id,
    workflowId,
    errorMessage: row.last_error,
  })
}
