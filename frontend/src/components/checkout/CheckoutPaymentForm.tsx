'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { commerceClient } from '@/lib/commerce'
import { clearCartId, dispatchCartUpdated, getActiveCart, getCartId } from '@/lib/commerce/cart'
import {
  getDefaultCheckoutAddress,
  isCartShippingComplete,
  isCustomerProfileComplete,
} from '@/lib/commerce/checkout-profile'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { PaymentMethodTiles } from './PaymentMethodTiles'
import { TrustSignals } from '@/components/cart/TrustSignals'
import type { Cart, PaymentProvider } from '@/lib/commerce/types'
import { parseGiftCardRedemptions } from '@/lib/commerce/gift-card'
import { formatPriceEur } from '@/lib/locale-format'
import type { GeneralSettings } from '@/lib/cms/types'

type CheckoutSettings = NonNullable<GeneralSettings['checkout']>

interface CheckoutPaymentFormProps {
  settings: CheckoutSettings
}

export function CheckoutPaymentForm({ settings }: CheckoutPaymentFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentFailed = searchParams.get('betaling') === 'mislukt'
  const { customer, loading: customerLoading } = useCustomer()
  const [cart, setCart] = useState<Cart | null>(null)
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [giftCode, setGiftCode] = useState('')
  const [giftCodeError, setGiftCodeError] = useState<string | null>(null)

  // Personal details (read-only, from customer or cart)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address1, setAddress1] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (customerLoading) return

      setLoading(true)
      const cartId = getCartId()
      if (!cartId) {
        router.replace('/winkelwagen')
        setLoading(false)
        return
      }

      let c = await getActiveCart()
      if (cancelled) return

      if (!c) {
        router.replace('/winkelwagen')
        setLoading(false)
        return
      }

      if (!c.email) {
        router.replace('/checkout/inloggen')
        setLoading(false)
        return
      }

      if (customer) {
        if (!isCustomerProfileComplete(customer)) {
          router.replace('/checkout/inloggen')
          setLoading(false)
          return
        }
        try {
          c = await commerceClient.syncCartFromCustomer(customer, c.id)
        } catch {
          router.replace('/checkout/inloggen')
          setLoading(false)
          return
        }
        if (cancelled) return
        setCart(c)
        setEmail(customer.email)
        setFirstName(customer.first_name ?? '')
        setLastName(customer.last_name ?? '')
        setPhone(customer.phone ?? '')
        const addr = getDefaultCheckoutAddress(customer)
        setAddress1(addr?.address_1 ?? '')
        setPostalCode(addr?.postal_code ?? '')
        setCity(addr?.city ?? '')
      } else {
        if (!isCartShippingComplete(c)) {
          router.replace('/checkout/inloggen')
          setLoading(false)
          return
        }
        setCart(c)
        setEmail(c.email ?? '')
        const addr = c.shipping_address
        setFirstName(addr?.first_name ?? '')
        setLastName(addr?.last_name ?? '')
        setPhone(addr?.phone ?? '')
        setAddress1(addr?.address_1 ?? '')
        setPostalCode(addr?.postal_code ?? '')
        setCity(addr?.city ?? '')
      }

      setLoading(false)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [customer, customerLoading, router])

  useEffect(() => {
    if (!cart?.region_id) return
    const totalDue = cart.total ?? 0
    if (totalDue <= 0) {
      setProviders([])
      setSelectedMethod(null)
      return
    }

    let cancelled = false
    ;(async () => {
      const ps = await commerceClient.listPaymentProviders(cart.region_id!)
      if (cancelled) return
      setProviders(ps)
      setSelectedMethod((prev) => {
        if (prev && ps.some((p) => p.id === prev)) return prev
        const ideal = ps.find((p) => p.id === 'pp_mollie-ideal_mollie')
        const first = ps.find((p) => p.id !== 'pp_system_default')
        return ideal?.id ?? first?.id ?? null
      })
    })()

    return () => {
      cancelled = true
    }
  }, [cart?.id, cart?.region_id, cart?.total])

  async function handleApplyGiftCode() {
    if (!giftCode.trim()) return
    setGiftCodeError(null)
    const cartId = getCartId()
    if (!cartId || !cart) return
    try {
      const promoCodes = ((cart as any).promotions ?? []).map((p: any) => p.code).filter(Boolean)
      const { cart: next } = await commerceClient.applyCode(cartId, giftCode.trim(), promoCodes)
      setCart(next)
      setGiftCode('')
      dispatchCartUpdated()
    } catch {
      setGiftCodeError('Deze code is niet geldig of al gebruikt.')
    }
  }

  async function handleRemoveGiftCode(code: string) {
    const cartId = getCartId()
    if (!cartId) return
    try {
      const next = await commerceClient.removeGiftCardCode(cartId, code)
      setCart(next)
      dispatchCartUpdated()
    } catch {
      setGiftCodeError('Kon de cadeaubon niet verwijderen.')
    }
  }

  async function handleRemovePromoCode(code: string) {
    const cartId = getCartId()
    if (!cartId || !cart) return
    const promo = ((cart as any).promotions ?? []).find((p: { code?: string }) => p.code === code)
    if (promo?.is_automatic === true) return
    setGiftCodeError(null)
    try {
      const next = await commerceClient.removePromoCodes(cartId, [code])
      setCart(next)
      dispatchCartUpdated()
    } catch {
      setGiftCodeError('Kon de kortingscode niet verwijderen.')
    }
  }

  const appliedGiftCodes = cart ? parseGiftCardRedemptions(cart.metadata).map((g) => g.code) : []
  const appliedPromotions = ((cart as any)?.promotions ?? []).filter((p: { code?: string }) =>
    Boolean(p.code)
  ) as { code: string; is_automatic?: boolean }[]

  const isFreeCheckout = cart != null && (cart.total ?? 0) <= 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cartId = getCartId()
    if (!cartId || !cart) return

    if (!isFreeCheckout) {
      if (!selectedMethod) {
        setError('Selecteer een betaalmethode.')
        return
      }
    }

    setBusy(true)
    try {
      if (isFreeCheckout) {
        const result = await commerceClient.completeCart(cartId)
        if (result.type === 'order') {
          clearCartId()
          router.replace(`/bedankt?order=${encodeURIComponent(result.order.id)}`)
          return
        }
        const errBody = result as { type: 'cart'; cart: Cart; error?: { message?: string } }
        showToast(
          errBody.error?.message ??
            'Bestelling afronden mislukt. Probeer het opnieuw of neem contact op.'
        )
        return
      }

      const session = await commerceClient.initiatePaymentSession(cartId, selectedMethod!)

      const data = session.data as {
        checkoutUrl?: string
        _links?: { checkout?: { href?: string } }
      }
      const checkoutUrl = data.checkoutUrl ?? data._links?.checkout?.href
      if (!checkoutUrl) {
        throw new Error('Geen betaallink ontvangen van Mollie.')
      }

      window.location.href = checkoutUrl
    } catch (err: any) {
      showToast(err.message ?? 'Betaling mislukt. Probeer het opnieuw of neem contact op.')
    } finally {
      setBusy(false)
    }
  }

  const payLabel = settings.payment?.payLabel ?? 'Betalen'
  const trust = settings.trust

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-va-lightgray-200 rounded w-1/3" />
        <div className="h-32 bg-va-lightgray-200 rounded" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {paymentFailed && (
        <div className="px-4 py-4 bg-amber-50 border border-amber-300 font-sans text-sm text-amber-900 space-y-1" role="alert">
          <p className="font-semibold">Je betaling is niet voltooid</p>
          <p>Je kunt hieronder een andere betaalmethode kiezen en het opnieuw proberen.</p>
        </div>
      )}

      {toast && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 font-sans text-sm text-red-700" role="alert">
          {toast}
        </div>
      )}

      {/* Personal details — read-only summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-base font-bold text-va-black">
            {settings.payment?.personalDetailsHeading ?? 'Jouw gegevens'}
          </h2>
          <Link
            href="/checkout/inloggen?bewerken=1"
            className="flex items-center gap-1.5 font-sans text-sm text-va-darkgray hover:text-va-black transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="underline underline-offset-2">Gegevens aanpassen</span>
          </Link>
        </div>
        <div className="border border-va-lightgray-300 bg-va-lightgray-100 px-4 py-3 font-sans text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-va-gray">Naam</dt>
            <dd className="text-va-black">
              {[firstName, lastName].filter(Boolean).join(' ') || '—'}
            </dd>
            <dt className="text-va-gray">E-mail</dt>
            <dd className="text-va-black break-all">{email || '—'}</dd>
            {phone && (
              <>
                <dt className="text-va-gray">Telefoon</dt>
                <dd className="text-va-black">{phone}</dd>
              </>
            )}
            {(address1 || postalCode || city) && (
              <>
                <dt className="text-va-gray">Adres</dt>
                <dd className="text-va-black">
                  {address1 && <div>{address1}</div>}
                  {(postalCode || city) && (
                    <div>
                      {postalCode.replace(/\s/g, '').toUpperCase().replace(/^(\d{4})([A-Z]{2})$/, '$1 $2')}
                      {postalCode && city && ' '}
                      {city}
                    </div>
                  )}
                </dd>
              </>
            )}
          </dl>
        </div>
      </section>

      {/* Gift / promo code */}
      <section className="space-y-3">
        <h2 className="font-sans text-base font-bold text-va-black">Cadeaubon / Tegoedbon</h2>
        {settings.payment?.giftCodeInstructions && (
          <p className="font-sans text-sm text-va-darkgray">{settings.payment.giftCodeInstructions}</p>
        )}
        {appliedPromotions.length > 0 && (
          <ul className="space-y-1">
            {appliedPromotions.map((p) => (
              <li key={`p-${p.code}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-xs text-va-darkgray">
                <span>
                  Kortingscode: <span className="font-mono">{p.code}</span>
                  {p.is_automatic === true && (
                    <span className="text-va-gray"> (automatisch toegevoegd)</span>
                  )}
                </span>
                {p.is_automatic !== true && (
                  <button
                    type="button"
                    onClick={() => void handleRemovePromoCode(p.code)}
                    className="text-va-darkgray hover:text-va-black underline underline-offset-2 shrink-0"
                  >
                    Verwijderen
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {appliedGiftCodes.length > 0 && (
          <ul className="space-y-1">
            {appliedGiftCodes.map((c) => (
              <li key={c} className="flex items-center gap-2 font-sans text-xs text-green-700">
                <span>Cadeaubon <span className="font-mono">{c}</span> toegepast.</span>
                <button
                  type="button"
                  onClick={() => handleRemoveGiftCode(c)}
                  className="text-va-darkgray hover:text-va-black underline"
                >
                  Verwijderen
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleApplyGiftCode()
              }
            }}
            placeholder="Voer je code in"
            className="flex-1 border border-va-lightgray-300 px-3 py-2 font-sans text-sm focus:outline-none focus:border-va-black"
          />
          <button
            type="button"
            onClick={handleApplyGiftCode}
            className="px-4 py-2 border border-va-black font-sans text-sm font-medium hover:bg-va-black hover:text-white transition-colors"
          >
            {settings.payment?.giftCodeApplyLabel ?? 'Code toepassen'}
          </button>
        </div>
        {giftCodeError && <p className="font-sans text-xs text-red-600">{giftCodeError}</p>}
      </section>

      {/* Payment methods — not required when total is €0 (Medusa skips payment collection) */}
      {!isFreeCheckout && (
        <section className="space-y-4">
          <h2 className="font-sans text-base font-bold text-va-black">
            {settings.payment?.methodsHeading ?? 'Betaalmethode kiezen'}
          </h2>
          <PaymentMethodTiles
            providers={providers}
            selected={selectedMethod}
            onSelect={setSelectedMethod}
          />
          {error && <p className="font-sans text-xs text-red-600">{error}</p>}
        </section>
      )}

      {isFreeCheckout && (
        <p className="font-sans text-sm text-va-darkgray">
          Er is geen betaling nodig voor dit bedrag. Je kunt je bestelling direct plaatsen.
        </p>
      )}

      {/* Betalen CTA */}
      <p className="font-sans text-xs text-va-darkgray text-left leading-relaxed mb-1">
        *Als je op betalen klikt ga je akkoord met onze{' '}
        <Link
          href="/algemene-voorwaarden"
          className="underline underline-offset-2 hover:text-va-black"
        >
          voorwaarden
        </Link>
      </p>
      <button
        type="submit"
        disabled={busy || (!isFreeCheckout && !selectedMethod)}
        className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-4 hover:bg-va-yellow/90 transition-colors disabled:opacity-60"
      >
        {busy
          ? isFreeCheckout
            ? 'Bestelling plaatsen…'
            : 'Betaling starten…'
          : cart
          ? `${payLabel} — ${formatPriceEur(cart.total, 'standard')}`
          : payLabel}
      </button>
      <p className="font-sans text-xs text-va-darkgray text-center leading-relaxed !mt-4">
        {isFreeCheckout ? (
          'Na het plaatsen van je bestelling ontvang je een e-mail met de gegevens van je inschrijving.'
        ) : (
          <>
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
              className="inline-block align-[-0.125em] mr-1 text-va-darkgray"
            >
              <rect
                x="1.5"
                y="2.5"
                width="11"
                height="9"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M1.5 4L7 8.25L12.5 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Na het voltooien van de betaling ontvang je op{' '}
            <span className="italic">{email || '—'}</span> een bestelbevestiging
          </>
        )}
      </p>

      {/* Trust signals */}
      {trust && (
        <TrustSignals
          secure={trust.secure}
          cancellation={trust.cancellation}
          support={trust.support}
          cancellationDays={trust.cancellationDays}
        />
      )}
    </form>
  )
}
