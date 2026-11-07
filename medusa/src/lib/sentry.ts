import * as Sentry from "@sentry/node"

export type CaptureContext = {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

export function captureWithContext(error: unknown, context: CaptureContext = {}): void {
  if (!process.env.SENTRY_DSN?.trim()) return
  Sentry.withScope((scope) => {
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value)
      }
    }
    if (context.extra) {
      scope.setExtras(filterExtra(context.extra))
    }
    Sentry.captureException(error)
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

