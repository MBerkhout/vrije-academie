'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { deleteTrackingCookies } from '@/lib/analytics/consent/cleanup'
import {
  OPEN_COOKIE_BANNER_EVENT,
  PRIVACY_COOKIE_POLICY_PATH,
} from '@/lib/analytics/consent/constants'
import { updateConsentFromChoice } from '@/lib/analytics/consent/gtag'
import { setStoredConsent } from '@/lib/analytics/consent/storage'
import { shouldShowCookieBanner } from '@/lib/analytics/consent/visibility'
import { isAnalyticsEnabled } from '@/lib/analytics/config'

export function CookieBanner() {
  const pathname = usePathname() ?? '/'
  const titleId = useId()
  const rejectRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)

  const evaluateVisibility = useCallback(() => {
    if (!isAnalyticsEnabled()) {
      setOpen(false)
      return
    }
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const show = shouldShowCookieBanner({
      pathname,
      userAgent: ua,
      forceOpen,
    })
    setOpen(show)
  }, [pathname, forceOpen])

  useEffect(() => {
    evaluateVisibility()
  }, [evaluateVisibility])

  useEffect(() => {
    const onReopen = () => {
      setForceOpen(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_COOKIE_BANNER_EVENT, onReopen)
    return () => window.removeEventListener(OPEN_COOKIE_BANNER_EVENT, onReopen)
  }, [])

  useEffect(() => {
    if (!open) return
    rejectRef.current?.focus()
  }, [open])

  if (!open) return null

  const close = () => {
    setForceOpen(false)
    setOpen(false)
  }

  const onAccept = () => {
    setStoredConsent(true)
    updateConsentFromChoice(true)
    close()
  }

  const onReject = () => {
    setStoredConsent(false)
    updateConsentFromChoice(false)
    deleteTrackingCookies()
    close()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-sm bg-white text-va-black shadow-xl"
      >
        <div className="border-b border-va-black/10 px-6 py-4">
          <Image
            src="/branding/logo.svg"
            alt="Vrije Academie"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </div>
        <div className="space-y-3 px-6 py-5 font-sans text-sm leading-relaxed">
          <h2 id={titleId} className="text-lg font-bold text-va-black">
            Mogen we cookies gebruiken?
          </h2>
          <p className="text-va-black/85">
            Door op &quot;Akkoord&quot; te klikken sta je ons toe om cookies te gebruiken op onze
            website om onze winkel te verbeteren en te personaliseren en voor analytische
            marketingdoeleinden. Meer informatie vind je in onze gegevens
            gegevensbeschermingsrichtlijnen.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-va-black/10 px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <button
            ref={rejectRef}
            type="button"
            onClick={onReject}
            className="order-1 rounded-sm border border-va-black/25 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-va-black/5 sm:order-none"
          >
            Niet Akkoord
          </button>
          <Link
            href={PRIVACY_COOKIE_POLICY_PATH}
            className="order-2 text-center text-sm font-medium text-va-black underline decoration-va-black/40 underline-offset-2 hover:decoration-va-black sm:order-none"
          >
            Lees meer
          </Link>
          <button
            type="button"
            onClick={onAccept}
            className="order-0 rounded-sm bg-va-yellow px-4 py-2.5 text-sm font-bold text-va-black transition-opacity hover:opacity-90 sm:order-none sm:ml-auto"
          >
            Akkoord
          </button>
        </div>
      </div>
    </div>
  )
}
