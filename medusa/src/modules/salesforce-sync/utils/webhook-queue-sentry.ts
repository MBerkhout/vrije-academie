import type { MedusaContainer } from "@medusajs/framework/types"

import { captureWithContext } from "../../../lib/sentry"
import SalesforceSyncModuleService from "../service"
import { computeWebhookQueueStats, type WebhookQueueStats } from "./webhook-queue-stats"

const PENDING_MAX_AGE_MS = 10 * 60 * 1000
const BACKLOG_WARN_INTERVAL_MS = 15 * 60 * 1000

let lastQueueBacklogWarnAt = 0

export type WebhookBacklogAlert =
  | { kind: "queue-failed-backlog"; message: string }
  | { kind: "queue-pending-backlog"; message: string }

export function webhookBacklogAlert(stats: WebhookQueueStats): WebhookBacklogAlert | null {
  const pendingStale =
    stats.oldestPendingAt != null &&
    Date.now() - new Date(stats.oldestPendingAt).getTime() > PENDING_MAX_AGE_MS

  if (stats.failed > 0) {
    return {
      kind: "queue-failed-backlog",
      message: `Salesforce webhook queue: ${stats.failed} terminal failed event(s) (retry in Admin or fix root cause)`,
    }
  }

  if (stats.pending > 0 && pendingStale) {
    return {
      kind: "queue-pending-backlog",
      message: `Salesforce webhook queue: ${stats.pending} pending event(s), oldest since ${stats.oldestPendingAt}`,
    }
  }

  return null
}

export async function reportWebhookQueueBacklogIfNeeded(container: MedusaContainer): Promise<void> {
  const env = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV
  if (env !== "production" || !process.env.SENTRY_DSN?.trim()) return

  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const stats = await computeWebhookQueueStats(sync)
  const alert = webhookBacklogAlert(stats)
  if (!alert) return

  const now = Date.now()
  if (now - lastQueueBacklogWarnAt < BACKLOG_WARN_INTERVAL_MS) return
  lastQueueBacklogWarnAt = now

  captureWithContext(new Error(alert.message), {
    tags: { flow: "salesforce-sync", kind: alert.kind },
    extra: {
      pending: stats.pending,
      failed: stats.failed,
      processing: stats.processing,
      oldest_pending_at: stats.oldestPendingAt,
      failed_by_object_type: stats.failedSummary?.byObjectType ?? null,
      top_failed_errors: stats.failedSummary?.topErrors ?? null,
    },
  })
}