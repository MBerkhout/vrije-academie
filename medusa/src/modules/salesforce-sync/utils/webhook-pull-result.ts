import type { RunResult } from "../../../workflows/salesforce/report-failure"

export type WebhookApplyResult = {
  medusaId?: string | null
  skipped?: boolean
  skipReason?: string
}

function asApplyResult(value: unknown): WebhookApplyResult | null {
  if (!value || typeof value !== "object") return null
  const row = value as WebhookApplyResult & { result?: unknown }
  if ("skipped" in row || "medusaId" in row || "skipReason" in row) {
    return {
      medusaId: row.medusaId,
      skipped: row.skipped,
      skipReason: row.skipReason,
    }
  }
  if ("result" in row) return asApplyResult(row.result)
  return null
}

export function extractWebhookApplyResult(ret: RunResult): WebhookApplyResult | null {
  return asApplyResult(ret.result)
}

/** Auto-import skips (hidden / past) stay skipped on the webhook row; `unchanged` is still success. */
export function webhookOutcomeFromApply(result: WebhookApplyResult | null): {
  outcome: "done" | "skipped"
  error?: string
  medusaId?: string | null
} {
  const medusaId = result?.medusaId?.trim() ? result.medusaId : null
  if (result?.skipped && result.skipReason && result.skipReason !== "unchanged") {
    return { outcome: "skipped", error: result.skipReason, medusaId }
  }
  return { outcome: "done", medusaId }
}
