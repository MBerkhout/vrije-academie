import * as Sentry from "@sentry/node"

export type CaptureContext = {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

function applyCaptureScope(scope: Sentry.Scope, context: CaptureContext): void {
  if (context.tags) {
    for (const [key, value] of Object.entries(context.tags)) {
      scope.setTag(key, value)
    }
  }
  if (context.extra) {
    scope.setExtras(filterExtra(context.extra))
  }
}

export function captureWithContext(error: unknown, context: CaptureContext = {}): void {
  if (!process.env.SENTRY_DSN?.trim()) return
  Sentry.withScope((scope) => {
    applyCaptureScope(scope, context)
    Sentry.captureException(error)
  })
}

/** Non-exception signals (queue backlog, integration not ready, etc.). */
export function captureMessageWithContext(
  message: string,
  context: CaptureContext = {},
  level: Sentry.SeverityLevel = "warning"
): void {
  if (!process.env.SENTRY_DSN?.trim()) return
  Sentry.withScope((scope) => {
    applyCaptureScope(scope, context)
    Sentry.captureMessage(message, level)
  })
}

function shouldSendCronCheckIn(): boolean {
  if (!process.env.SENTRY_DSN?.trim()) return false
  const env = process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV
  if (env !== "production") return false
  const workerMode = process.env.MEDUSA_WORKER_MODE
  if (workerMode && workerMode !== "worker") return false
  return true
}

/**
 * Runs a scheduled job under a Sentry cron monitor. Check-ins only from the production
 * medusa-worker (never staging/dev or the HTTP-only PM2 app — stray `development` env
 * tracks caused false "missed check-in" noise in Sentry).
 */
export async function withCronMonitor<T>(
  slug: string,
  schedule: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!shouldSendCronCheckIn()) return fn()
  return Sentry.withMonitor(slug, fn, {
    schedule: { type: "crontab", value: schedule },
    checkinMargin: 5,
    maxRuntime: 10,
    failureIssueThreshold: 3,
    recoveryThreshold: 1,
    upsert: true,
  })
}

function filterExtra(extra: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(extra)) {
    if (/email|password|token|phone|iban/i.test(key)) continue
    out[key] = value
  }
  return out
}

