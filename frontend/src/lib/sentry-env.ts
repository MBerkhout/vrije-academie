/** Shared Sentry env helpers (server + client). */

export function sentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim())
}

export function sentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development'
  )
}

export function sentryRelease(): string | undefined {
  const raw = process.env.SENTRY_RELEASE?.trim() || process.env.DEPLOYMENT_VERSION?.trim()
  return raw || undefined
}

export function sentryTracesSampleRate(): number {
  const explicit = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim()
  if (explicit) {
    const n = Number.parseFloat(explicit)
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n))
  }
  const env = sentryEnvironment()
  if (env === 'production') return 0.2
  if (env === 'staging' || env === 'preview') return 1
  return 1
}

export function medusaTracePropagationTargets(): (string | RegExp)[] {
  const raw = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim()
  const targets: (string | RegExp)[] = ['localhost', /^\/api\//]
  if (raw) {
    try {
      targets.push(new URL(raw).origin)
    } catch {
      targets.push(raw.replace(/\/$/, ''))
    }
  }
  return targets
}
