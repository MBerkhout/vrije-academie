import '@/lib/suppress-i18next-support-notice'

import * as Sentry from '@sentry/nextjs'

import {
  medusaTracePropagationTargets,
  sentryEnvironment,
  sentryRelease,
  sentryTracesSampleRate,
} from '@/lib/sentry-env'
import { filterSentryEvent, SENTRY_CLIENT_IGNORE_ERRORS } from '@/lib/sentry-filter'
import { scrubSentryEvent } from '@/lib/sentry-scrub'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()

if (dsn) {
  Sentry.init({
    dsn,
    environment: sentryEnvironment(),
    release: sentryRelease(),
    tracesSampleRate: sentryTracesSampleRate(),
    integrations: [Sentry.browserTracingIntegration()],
    tracePropagationTargets: medusaTracePropagationTargets(),
    ignoreErrors: SENTRY_CLIENT_IGNORE_ERRORS,
    beforeSend(event, hint) {
      const filtered = filterSentryEvent(event, hint)
      if (!filtered) return null
      return scrubSentryEvent(filtered)
    },
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
