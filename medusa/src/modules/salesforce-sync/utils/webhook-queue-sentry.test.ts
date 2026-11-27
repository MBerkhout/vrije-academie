import { describe, expect, it } from "vitest"

import { webhookBacklogAlert } from "./webhook-queue-sentry"
import type { WebhookQueueStats } from "./webhook-queue-stats"

function baseStats(overrides: Partial<WebhookQueueStats>): WebhookQueueStats {
  return {
    pending: 0,
    processing: 0,
    failed: 0,
    done: 0,
    skipped: 0,
    doneLast24h: 0,
    oldestPendingAt: null,
    failedSummary: null,
    ...overrides,
  }
}

describe("webhookBacklogAlert", () => {
  it("reports terminal failed rows even when pending is zero", () => {
    const alert = webhookBacklogAlert(baseStats({ failed: 30 }))
    expect(alert?.kind).toBe("queue-failed-backlog")
    expect(alert?.message).toContain("30")
  })

  it("does not treat terminal failures as a live pending backlog", () => {
    const alert = webhookBacklogAlert(
      baseStats({
        failed: 5,
        pending: 0,
        oldestPendingAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
    )
    expect(alert?.kind).toBe("queue-failed-backlog")
  })

  it("reports stale pending only when no terminal failures", () => {
    const old = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const alert = webhookBacklogAlert(baseStats({ pending: 3, oldestPendingAt: old }))
    expect(alert?.kind).toBe("queue-pending-backlog")
  })

  it("stays quiet when pending is fresh", () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    expect(webhookBacklogAlert(baseStats({ pending: 3, oldestPendingAt: recent }))).toBeNull()
  })
})