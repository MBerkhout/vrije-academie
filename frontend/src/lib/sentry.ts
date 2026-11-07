import 'server-only'

import * as Sentry from '@sentry/nextjs'

export type SentryContext = {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  flow?: string
}

export function captureServerError(error: unknown, context: SentryContext = {}): void {
  if (!process.env.SENTRY_DSN?.trim()) return
  Sentry.withScope((scope) => {
    if (context.flow) scope.setTag('flow', context.flow)
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value)
      }
    }
    if (context.extra) {
      scope.setExtras(scrubIds(context.extra))
    }
    Sentry.captureException(error)
  })
}

function scrubIds(extra: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(extra)) {
    if (/email|password|token|phone|iban/i.test(key)) continue
    out[key] = value
  }
  return out
}

export function medusaTraceHeaders(): Record<string, string> {
  if (!process.env.SENTRY_DSN?.trim()) return {}
  const data = Sentry.getTraceData()
  const headers: Record<string, string> = {}
  if (data['sentry-trace']) headers['sentry-trace'] = data['sentry-trace']
  if (data.baggage) headers.baggage = data.baggage
  return headers
}
