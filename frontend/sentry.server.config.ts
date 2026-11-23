import * as Sentry from '@sentry/nextjs'

import {
  medusaTracePropagationTargets,
  sentryEnabled,
  sentryEnvironment,
  sentryRelease,
  sentryTracesSampleRate,
} from './src/lib/sentry-env'
import { scrubSentryEvent } from './src/lib/sentry-scrub'

if (sentryEnabled()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: sentryEnvironment(),
    release: sentryRelease(),
    tracesSampleRate: sentryTracesSampleRate(),
    tracePropagationTargets: medusaTracePropagationTargets(),
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
      /router state header was sent but could not be parsed/,
    ],
    beforeSend(event, hint) {
      // Group every Medusa 5xx / outage error into one issue so an outage does not flood Sentry.
      const original = hint?.originalException
      if (original instanceof Error && original.name === 'MedusaUnavailableError') {
        event.fingerprint = ['medusa-upstream-unavailable']
        event.tags = { ...event.tags, upstream: 'medusa' }
      }
      return scrubSentryEvent(event)
    },
  })
}
