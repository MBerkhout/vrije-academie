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
    beforeSend: scrubSentryEvent,
  })
}
