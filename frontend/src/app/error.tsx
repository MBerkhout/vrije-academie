'use client'

import { useEffect } from 'react'
import { ErrorView } from '@/components/ErrorView'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen">
      <ErrorView onRetry={reset} digest={error.digest} standalone />
    </main>
  )
}
