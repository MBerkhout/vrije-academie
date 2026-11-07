import '@/lib/suppress-i18next-support-notice'

import * as Sentry from '@sentry/nextjs'

import {
  medusaTracePropagationTargets,
  sentryEnvironment,
  sentryRelease,
  sentryTracesSampleRate,
} from '@/lib/sentry-env'
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
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
    ],
    beforeSend: scrubSentryEvent,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
