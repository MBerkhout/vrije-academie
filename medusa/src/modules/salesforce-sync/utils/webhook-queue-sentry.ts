import type { MedusaContainer } from "@medusajs/framework/types"

import { captureWithContext } from "../../../lib/sentry"
import SalesforceSyncModuleService from "../service"
import { computeWebhookQueueStats, type WebhookQueueStats } from "./webhook-queue-stats"

const PENDING_MAX_AGE_MS = 10 * 60 * 1000
const BACKLOG_WARN_INTERVAL_MS = 15 * 60 * 1000

let lastQueueBacklogWarnAt = 0

function shouldReportBacklog(stats: WebhookQueueStats): boolean {
  if (stats.failed > 0) return true
  if (!stats.oldestPendingAt) return false
  return Date.now() - new Date(stats.oldestPendingAt).getTime() > PENDING_MAX_AGE_MS
}

export async function reportWebhookQueueBacklogIfNeeded(container: MedusaContainer): Promise<void> {
  const env = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV
  if (env !== "production" || !process.env.SENTRY_DSN?.trim()) return

  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const stats = await computeWebhookQueueStats(sync)
  if (!shouldReportBacklog(stats)) return

  const now = Date.now()
  if (now - lastQueueBacklogWarnAt < BACKLOG_WARN_INTERVAL_MS) return
  lastQueueBacklogWarnAt = now

  captureWithContext(new Error("Salesforce webhook queue backlog"), {
    tags: { flow: "salesforce-sync", kind: "queue-backlog" },
    extra: {
      pending: stats.pending,
      failed: stats.failed,
      processing: stats.processing,
      oldest_pending_at: stats.oldestPendingAt,
    },
  })
}
