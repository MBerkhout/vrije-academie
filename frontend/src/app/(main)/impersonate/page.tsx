'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { commerceClient } from '@/lib/commerce'
import { defaultMessages } from '@/lib/i18n/messages'

function readCodeFromFragment(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const code = params.get('code')?.trim()
  return code || null
}

function stripFragment(): void {
  if (typeof window === 'undefined') return
  const { pathname, search } = window.location
  window.history.replaceState(null, '', `${pathname}${search}`)
}

export default function ImpersonatePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const t = defaultMessages.common

  useEffect(() => {
    const code = readCodeFromFragment()
    stripFragment()
    if (!code) {
      setError('Geen geldige inloglink. Vraag in Medusa Admin opnieuw om “Log in as customer”.')
      return
    }

    let cancelled = false
    void (async () => {
      try {
        await commerceClient.exchangeImpersonation(code)
        if (!cancelled) {
          window.dispatchEvent(new Event('va:customer-updated'))
          router.replace('/mijn-account')
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error && e.message !== 'IMPERSONATION_FAILED'
              ? e.message
              : 'Deze link is verlopen of ongeldig. Vraag in Medusa Admin opnieuw om “Log in as customer”.'
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 font-sans text-va-darkgray">
        <h1 className="text-xl font-semibold mb-4">Inloggen mislukt</h1>
        <p className="mb-6">{error}</p>
        <Link href="/" className="text-va-orange underline">
          Naar de homepage
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 font-sans text-va-darkgray" aria-busy="true">
      <p>{t.loadingEllipsis}</p>
    </div>
  )
}