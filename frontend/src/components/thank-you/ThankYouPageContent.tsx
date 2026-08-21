'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ThankYouOrderItems, ThankYouOrderTotals } from '@/components/thank-you/ThankYouOrderSummary'
import { ThankYouVathuisRecommendations } from '@/components/thank-you/ThankYouVathuisRecommendations'
import { clearCartId, dispatchCartUpdated, getCartId } from '@/lib/commerce/cart'
import { fetchCheckoutConfirmation } from '@/lib/commerce/fetch-checkout-confirmation'
import type { CheckoutConfirmationPayload } from '@/lib/commerce/checkout-confirmation-types'

const POLL_MS = 1200
const MAX_POLLS = 45

export interface ThankYouContactInfo {
  phone?: string | null
  email?: string | null
}

function telHref(phoneLine: string): string {
  const digits = phoneLine.replace(/\D/g, '')
  if (digits.length >= 9) return `tel:${digits}`
  return 'tel:'
}

function displayPhone(phoneLine: string): string {
  return phoneLine
    .replace(/^Telefoon:\s*/i, '')
    .replace(/\s*\(?tegen de gebruikelijke belkosten\)?\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 6l-10 7L2 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SuccessIcon() {
  return (
    <div className="w-12 h-12 shrink-0 rounded-full bg-va-yellow flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M8 16l6 6 10-10"
          stroke="black"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function ParticipationNotices({ notices }: { notices: CheckoutConfirmationPayload['notices'] }) {
  if (!notices.show_offline) return null

  return (
    <p className="text-sm text-va-darkgray leading-relaxed">
      Je ontvangt uiterlijk 7 dagen voor aanvang per e-mail je bewijs van deelname met de
      benodigde informatie.
    </p>
  )
}

function ContactBlock({ contact }: { contact: ThankYouContactInfo }) {
  if (!contact.phone && !contact.email) return null
  return (
    <div className="border-t border-va-lightgray-300 pt-6 space-y-3">
      <p className="font-sans font-semibold text-sm text-va-black">Vragen? Neem contact op</p>
      <div className="font-sans text-sm text-va-darkgray flex flex-col gap-2">
        {contact.phone ? (
          <a
            href={telHref(contact.phone)}
            className="inline-flex items-center gap-2 hover:text-va-black transition-colors"
          >
            <PhoneIcon />
            {displayPhone(contact.phone)}
          </a>
        ) : null}
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-2 hover:text-va-black transition-colors"
          >
            <EmailIcon />
            {contact.email}
          </a>
        ) : null}
      </div>
    </div>
  )
}

export function ThankYouPageContent({ contact = {} }: { contact?: ThankYouContactInfo }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderFromUrl = searchParams.get('order')
  const tokenFromUrl = searchParams.get('token')
  const sessionFromUrl = searchParams.get('session_id')

  const [payload, setPayload] = useState<CheckoutConfirmationPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(true)
  const clearedCart = useRef(false)

  // Clear cart immediately if order ID is already in URL (revisit scenario)
  useEffect(() => {
    if (!orderFromUrl || clearedCart.current) return
    clearCartId()
    clearedCart.current = true
  }, [orderFromUrl])

  // Polling loop
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      if (cancelled) return

      const cartId = getCartId()
      if (!orderFromUrl && !sessionFromUrl && !cartId) {
        setError('Geen bestelling gevonden. Controleer je e-mail voor de bevestiging.')
        setPolling(false)
        return
      }

      try {
        const result = await fetchCheckoutConfirmation({
          orderId: orderFromUrl,
          token: tokenFromUrl,
          cartId: orderFromUrl ? null : cartId,
          sessionId: sessionFromUrl,
        })

        if (cancelled) return

        if (result.status === 'ready' && result.order) {
          setPayload(result)
          setPolling(false)
          if (!clearedCart.current) {
            clearCartId()
            clearedCart.current = true
          }
          // Update URL to include order ID + token for bookmarking
          if (result.view_token && result.order.id) {
            const newParams = new URLSearchParams()
            newParams.set('order', result.order.id)
            newParams.set('token', result.view_token)
            router.replace(`/bedankt?${newParams.toString()}`, { scroll: false })
          }
          dispatchCartUpdated()
          return
        }

        if (result.status === 'failed') {
          // Payment was canceled or failed — send user back to checkout payment step
          router.replace('/checkout/betaling?betaling=mislukt')
          return
        }

        attempts += 1
        if (attempts >= MAX_POLLS) {
          setError(
            'Je betaling wordt verwerkt. Je ontvangt een bevestiging per e-mail zodra de bestelling rond is.'
          )
          setPolling(false)
          return
        }

        timer = setTimeout(poll, POLL_MS)
      } catch {
        if (cancelled) return
        setError('Kon de bestelling niet laden. Controleer je e-mail voor de bevestiging.')
        setPolling(false)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [orderFromUrl, tokenFromUrl, sessionFromUrl, router])

  const order = payload?.order
  const isReady = Boolean(payload?.order)

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10 md:py-14 space-y-12">

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 xl:gap-12 items-start">

        {/* Left: confirmation details */}
        <div className="space-y-8">

          {isReady ? (
            <div className="flex items-start gap-4">
              <SuccessIcon />
              <div className="space-y-1 pt-1">
                <h1 className="font-sans text-2xl md:text-3xl font-bold text-va-black leading-tight">
                  {order?.first_name
                    ? <>Bedankt voor je inschrijving, {order.first_name}!</>
                    : 'Bedankt voor je inschrijving!'}
                </h1>
                {order?.email ? (
                  <p className="font-sans text-sm text-va-darkgray">
                    Je ontvangt een bevestiging op{' '}
                    <strong className="text-va-black">{order.email}</strong>
                  </p>
                ) : (
                  <p className="font-sans text-sm text-va-darkgray">
                    Je ontvangt een bevestiging per e-mail.
                  </p>
                )}
                {order?.display_id != null ? (
                  <p className="font-sans text-sm text-va-darkgray">
                    Bestelnummer:{' '}
                    <strong className="text-va-black font-semibold">#{order.display_id}</strong>
                  </p>
                ) : null}
              </div>
            </div>
          ) : polling ? (
            <div className="space-y-2">
              <h1 className="font-sans text-2xl md:text-3xl font-bold text-va-black leading-tight">
                We controleren je betaling…
              </h1>
              <p className="font-sans text-sm text-va-darkgray animate-pulse" role="status">
                Een moment geduld alstublieft.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="font-sans text-sm text-va-darkgray bg-va-lightgray-100 border border-va-lightgray-300 px-4 py-3">
              {error}
            </p>
          ) : null}

          {/* Participation notices */}
          {payload ? <ParticipationNotices notices={payload.notices} /> : null}

          {/* Contact */}
          <ContactBlock contact={contact} />
        </div>

        {/* Right: order summary */}
        {payload?.items?.length ? (
          <aside className="bg-va-lightgray-50 border border-va-lightgray-300 px-5 py-5 space-y-4">
            <h2 className="font-sans text-sm font-bold text-va-black uppercase tracking-wide">
              Jouw bestelling
            </h2>
            <ThankYouOrderItems items={payload.items} />
            {order ? (
              <ThankYouOrderTotals
                subtotal={order.subtotal}
                discountTotal={order.discount_total}
                taxTotal={order.tax_total}
                total={order.total}
              />
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* VA Thuis recommendations – full width */}
      {payload?.vathuis_recommendations?.length ? (
        <ThankYouVathuisRecommendations
          items={payload.vathuis_recommendations}
          primaryCategory={payload.primary_category ?? null}
        />
      ) : null}
    </div>
  )
}
