'use client'

import { useEffect } from 'react'
import { Source_Sans_3 } from 'next/font/google'
import { ErrorView } from '@/components/ErrorView'
import './globals.css'

const fontSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

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
    <html lang="nl" className={fontSans.variable}>
      <body>
        <main className="min-h-screen">
          <ErrorView onRetry={reset} digest={error.digest} standalone />
        </main>
      </body>
    </html>
  )
}
