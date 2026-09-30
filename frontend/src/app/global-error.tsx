'use client'

import { useEffect } from 'react'
import { ErrorView } from '@/components/ErrorView'
import './globals.css'

export default function GlobalError({
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
    <html lang="nl">
      <body>
        <main className="min-h-screen">
          <ErrorView onRetry={reset} digest={error.digest} standalone />
        </main>
      </body>
    </html>
  )
}
