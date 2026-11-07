import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"

const dsn = process.env.SENTRY_DSN?.trim()
const globalKey = "__va_medusa_sentry_initialized__"

function sentryEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || "development"
}

function tracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim()
  if (raw) {
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n))
  }
  const env = sentryEnvironment()
  return env === "production" ? 0.2 : 1
}

function profilesSampleRate(): number {
  const raw = process.env.SENTRY_PROFILES_SAMPLE_RATE?.trim()
  if (raw) {
    const n = Number.parseFloat(raw)
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n))
  }
  return 0
}

if (dsn && !(globalThis as Record<string, unknown>)[globalKey]) {
  ;(globalThis as Record<string, unknown>)[globalKey] = true
  Sentry.init({
    dsn,
    environment: sentryEnvironment(),
    release: process.env.SENTRY_RELEASE?.trim() || undefined,
    tracesSampleRate: tracesSampleRate(),
    profileSessionSampleRate: profilesSampleRate(),
    integrations: [
      Sentry.httpIntegration(),
      Sentry.postgresIntegration(),
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      ...(profilesSampleRate() > 0 ? [nodeProfilingIntegration()] : []),
    ],
    beforeSend(event) {
      return scrubMedusaEvent(event)
    },
  })
}

const SENSITIVE_KEYS =
  /^(password|token|secret|authorization|cookie|email|phone|iban|card|payment|otp)$/i
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(EMAIL_RE, "[email]")
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue)
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.test(key) ? "[Filtered]" : scrubValue(val)
    }
    return out
  }
  return value
}

function scrubMedusaEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request?.headers) {
    const headers = { ...event.request.headers }
    for (const key of Object.keys(headers)) {
      if (/authorization|cookie/i.test(key)) {
        headers[key] = "[Filtered]"
      }
    }
    event.request.headers = headers
  }
  if (event.extra) {
    event.extra = scrubValue(event.extra) as Record<string, unknown>
  }
  return event
}
