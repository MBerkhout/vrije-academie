'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { ErrorView } from '@/components/ErrorView'

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag('flow', 'checkout')
      Sentry.captureException(error)
    })
  }, [error])

  return <ErrorView onRetry={reset} digest={error.digest} />
}
