import type SalesforceSyncModuleService from "../service"

const DAY_MS = 24 * 60 * 60 * 1000

export type WebhookQueueStats = {
  pending: number
  processing: number
  failed: number
  done: number
  skipped: number
  doneLast24h: number
  oldestPendingAt: string | null
}

export async function computeWebhookQueueStats(
  sync: InstanceType<typeof SalesforceSyncModuleService>
): Promise<WebhookQueueStats> {
  const allForStats = await sync.listSalesforceWebhookEvents({}, { take: 5000 })
  const now = Date.now()
  const stats: WebhookQueueStats = {
    pending: 0,
    processing: 0,
    failed: 0,
    done: 0,
    skipped: 0,
    doneLast24h: 0,
    oldestPendingAt: null,
  }

  let oldestPending: Date | null = null
  for (const row of allForStats) {
    const status = row.status ?? "pending"
    if (status === "pending") {
      stats.pending += 1
      const received = row.received_at ? new Date(row.received_at) : null
      if (received && (!oldestPending || received < oldestPending)) {
        oldestPending = received
      }
    } else if (status === "processing") stats.processing += 1
    else if (status === "failed") stats.failed += 1
    else if (status === "skipped") stats.skipped += 1
    else if (status === "done") {
      stats.done += 1
      const processed = row.processed_at ? new Date(row.processed_at).getTime() : 0
      if (processed && now - processed <= DAY_MS) stats.doneLast24h += 1
    }
  }
  stats.oldestPendingAt = oldestPending?.toISOString() ?? null
  return stats
}
