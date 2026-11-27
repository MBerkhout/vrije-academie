import type { ExecArgs } from "@medusajs/framework/types"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { computeWebhookQueueStats } from "../modules/salesforce-sync/utils/webhook-queue-stats"

/**
 * Production ops: print terminal failed webhook rows and grouped errors.
 *
 *   npm run salesforce:inspect-webhook-failures
 */
export default async function inspectWebhookQueueFailures({ container }: ExecArgs) {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const stats = await computeWebhookQueueStats(sync)

  console.log("Webhook queue stats:", {
    pending: stats.pending,
    processing: stats.processing,
    failed: stats.failed,
    done: stats.done,
    skipped: stats.skipped,
    doneLast24h: stats.doneLast24h,
    oldestPendingAt: stats.oldestPendingAt,
  })

  if (stats.failedSummary) {
    console.log("\nFailed by Salesforce object_type:", stats.failedSummary.byObjectType)
    console.log("\nTop error messages:")
    for (const row of stats.failedSummary.topErrors) {
      console.log(`  (${row.count}x) ${row.message}`)
    }
  }

  const failedRows = await sync.listSalesforceWebhookEvents(
    { status: "failed" },
    { take: 100, order: { processed_at: "DESC" } }
  )

  if (!failedRows.length) {
    console.log("\nNo terminal failed rows in the latest batch.")
    return
  }

  console.log(`\nLatest ${failedRows.length} failed row(s):`)
  for (const row of failedRows) {
    const err = row.error?.trim() ? row.error.trim().slice(0, 160) : "(no error)"
    console.log(
      `  ${row.id} ${row.object_type} ${row.method} sf=${row.salesforce_id} attempts=${row.attempts ?? 0} — ${err}`
    )
  }
}