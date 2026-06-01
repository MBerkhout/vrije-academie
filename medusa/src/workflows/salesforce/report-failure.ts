import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../../modules/salesforce-sync/service"

const ALERT_BUCKETS = [1, 5, 25, 100] as const

export type FailureContext = {
  entityType: string
  medusaId: string
  salesforceId?: string | null
  workflowId: string
  errorMessage: string
  salesforceErrorCode?: string
}

function shouldSendAlert(failureCount: number, lastBucket: number | null): { bucket: number; send: boolean } {
  const bucket =
    [...ALERT_BUCKETS].reverse().find((b) => failureCount >= b) ?? 1
  if (failureCount === 1) return { bucket, send: true }
  if (bucket > (lastBucket ?? 0)) return { bucket, send: true }
  return { bucket, send: false }
}

export async function reportSalesforceFailure(
  container: MedusaContainer,
  ctx: FailureContext
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  let row = await sync.getStateByMedusaId(ctx.entityType, ctx.medusaId)
  if (!row) {
    const [created] = await sync.createSalesforceSyncStates([
      {
        entity_type: ctx.entityType,
        medusa_id: ctx.medusaId,
        salesforce_id: ctx.salesforceId ?? null,
        last_status: "error",
        last_error: ctx.errorMessage,
        failure_count: 1,
        severity: "error",
      },
    ])
    row = created
  } else {
    const nextCount = (row.failure_count ?? 0) + 1
    await sync.updateSalesforceSyncStates({
      id: row.id,
      last_status: "error",
      last_error: ctx.errorMessage,
      failure_count: nextCount,
      severity: "error",
      salesforce_id: ctx.salesforceId ?? row.salesforce_id,
    })
    row = (await sync.retrieveSalesforceSyncState(row.id))!
  }

  logger.error(
    `[salesforce-sync] terminal failure: ${ctx.errorMessage} | entity=${ctx.entityType} medusa=${ctx.medusaId} salesforce=${ctx.salesforceId ?? ""} workflow=${ctx.workflowId} failures=${row.failure_count}`
  )

  const webhook = process.env.SALESFORCE_SYNC_ALERT_WEBHOOK_URL?.trim()
  if (!webhook || !row) return

  const { bucket, send } = shouldSendAlert(row.failure_count ?? 1, row.last_alert_at_failure_bucket ?? null)
  if (!send) return

  const adminBase = process.env.MEDUSA_ADMIN_URL?.replace(/\/$/, "") || "http://localhost:9000/app"
  const text = `[salesforce-sync] ${ctx.entityType} ${ctx.medusaId} failed (${row.failure_count}x): ${ctx.errorMessage}`
  const payload = {
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Salesforce sync failure*\n${text}\n<${adminBase}/salesforce-sync|Open failures>`,
        },
      },
    ],
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    await sync.updateSalesforceSyncStates({
      id: row.id,
      last_alert_at_failure_bucket: bucket,
    })
  } catch (e) {
    logger.warn(`[salesforce-sync] alert webhook failed: ${(e as Error).message}`)
  }
}

export type RunResult = {
  hasFailed?: boolean
  errors?: { error: Error | string }[]
  thrownError?: Error
  result?: unknown
}

/** Run workflow via Redis engine; on failure update state + optional Slack alert. */
export async function runSalesforceWorkflow(
  container: MedusaContainer,
  workflowId: string,
  input: Record<string, unknown>,
  meta: { eventGroupId: string; entityType: string; medusaId: string }
): Promise<RunResult> {
  const engine = container.resolve(Modules.WORKFLOW_ENGINE) as {
    run: (id: string, opts: Record<string, unknown>) => Promise<
      RunResult & {
        acknowledgement?: { hasFailed?: boolean; transactionId?: string }
      }
    >
  }
  const ret = await engine.run(workflowId, {
    input,
    context: { eventGroupId: meta.eventGroupId },
    throwOnError: false,
  })
  const failed =
    ret.hasFailed === true ||
    ret.acknowledgement?.hasFailed === true ||
    !!ret.thrownError ||
    (Array.isArray(ret.errors) && ret.errors.length > 0)
  if (failed) {
    const err =
      ret.thrownError ||
      (ret.errors?.[0]?.error instanceof Error
        ? ret.errors[0].error
        : new Error(String(ret.errors?.[0]?.error ?? "Workflow failed")))
    await reportSalesforceFailure(container, {
      entityType: meta.entityType,
      medusaId: meta.medusaId,
      workflowId,
      errorMessage: err.message,
    })
  }
  return ret
}
