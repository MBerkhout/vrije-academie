'use client'

/**
 * Checkout identity step: email lookup → login | guest details (+ optional account).
 * Shared pieces: `ValidatedInput`, `PasswordStrengthMeter`, `validateAccountField` (see `@/lib/auth`, `@/components/auth`).
 * Step UI lives under `components/checkout/login/`.
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  buildCheckoutDraft,
  clearCheckoutDraft,
  draftFromCart,
  saveCheckoutDraft,
} from '@/lib/commerce/checkout-draft'
import { ensureGuestCheckoutCartHydrated } from '@/lib/commerce/checkout-resume'
import {
  getDefaultCheckoutAddress,
  isGuestCartCheckoutReady,
  isCustomerProfileComplete,
  splitAddressLine,
} from '@/lib/commerce/checkout-profile'
import type { Cart } from '@/lib/commerce/types'
import { commerceClient } from '@/lib/commerce'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { getActiveCart, setCartId, dispatchCartUpdated } from '@/lib/commerce/cart'
import type { Customer } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import {
  initialCheckoutGuestValidity,
  validateAccountField,
  type AccountFieldName,
  type CheckoutGuestValidity,
} from '@/lib/auth/account-field-validation'
import { useCountryToggleManualAddress } from '@/lib/address/useCountryToggleManualAddress'
import { usePdokAddressLookup } from '@/lib/address/usePdokAddressLookup'
import { CheckoutLoginEmailStep } from '@/components/checkout/login/CheckoutLoginEmailStep'
import { CheckoutLoginKnownStep } from '@/components/checkout/login/CheckoutLoginKnownStep'
import { CheckoutGuestDetailsStep } from '@/components/checkout/login/CheckoutGuestDetailsStep'

type CheckoutSettings = NonNullable<GeneralSettings['checkout']>

type State = 'email' | 'known' | 'unknown' | 'loading' | 'logged_in_details'
type AuthMode = 'password' | 'otp'

interface CheckoutLoginFormProps {
  settings: CheckoutSettings
}

export function CheckoutLoginForm({ settings }: CheckoutLoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editingDetails = searchParams.get('bewerken') === '1'
  const { customer, refresh, logout, loading: customerLoading } = useCustomer()
  const [state, setState] = useState<State>('email')
  const [email, setEmail] = useState('')
  const [hasPassword, setHasPassword] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('password')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpResendCooldown, setOtpResendCooldown] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('NL')
  const [newsletterOptIn, setNewsletterOptIn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [manualAddress, setManualAddress] = useState(false)
  const [validity, setValidity] = useState<CheckoutGuestValidity>(() => initialCheckoutGuestValidity())
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem('va_checkout_newsletter')
      if (!raw) return
      const parsed = JSON.parse(raw) as { optIn?: boolean }
      if (typeof parsed?.optIn === 'boolean') setNewsletterOptIn(parsed.optIn)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (otpResendCooldown <= 0) return
    const timer = window.setTimeout(() => {
      setOtpResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [otpResendCooldown])

  useEffect(() => {
    if (state !== 'known' || hasPassword || otpSent || busy) return
    void sendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-send once when passwordless known email
  }, [state, hasPassword, otpSent, busy])

  const { addressLookup } = usePdokAddressLookup({
    postalCode,
    houseNumber,
    manualAddress,
    countryCode: country,
    onMatch: (s, c) => {
      setStreet(s)
      setCity(c)
    },
    onClear: () => {
      setStreet('')
      setCity('')
    },
    onAutofillValidity: () =>
      setValidity((prev) => ({
        ...prev,
        street: { state: 'valid' },
        city: { state: 'valid' },
      })),
  })

  function resetValidity(name: AccountFieldName) {
    setValidity((prev) => (prev[name].state === 'idle' ? prev : { ...prev, [name]: { state: 'idle' } }))
  }

  function blurField(name: AccountFieldName, value: string, extra?: { password?: string }) {
    const opts =
      name === 'password'
        ? { ...extra, passwordRequirement: 'login' as const, countryCode: country }
        : { ...extra, countryCode: country }
    setValidity((prev) => ({ ...prev, [name]: validateAccountField(name, value, opts) }))
  }

  const prefillAddressFromLine = useCallback(
    (line: string, postal: string, cityName: string, countryCode: string) => {
      setPostalCode(postal)
      setCity(cityName)
      const countryUpper = countryCode.toUpperCase()
      setCountry(countryUpper)
      const { street: st, houseNumber: hn } = splitAddressLine(line)
      if (countryUpper !== 'NL') {
        setManualAddress(true)
        setStreet(st)
        setHouseNumber(hn ?? '')
        return
      }
      if (hn) {
        setManualAddress(false)
        setStreet(st)
        setHouseNumber(hn)
      } else {
        setManualAddress(true)
        setStreet(st)
        setHouseNumber('')
      }
    },
    []
  )

  const prefillFromCustomer = useCallback((c: Customer) => {
    setFirstName(c.first_name ?? '')
    setLastName(c.last_name ?? '')
    setPhone(c.phone ?? '')
    const addr = getDefaultCheckoutAddress(c)
    if (!addr) {
      setManualAddress(false)
      setPostalCode('')
      setHouseNumber('')
      setStreet('')
      setCity('')
      setCountry('NL')
      return
    }
    prefillAddressFromLine(
      addr.address_1 ?? '',
      addr.postal_code ?? '',
      addr.city ?? '',
      addr.country_code ?? 'nl'
    )
  }, [prefillAddressFromLine])

  const prefillFromCart = useCallback(
    (cart: Cart) => {
      setEmail(cart.email ?? '')
      const addr = cart.shipping_address
      if (!addr) {
        setManualAddress(false)
        setPostalCode('')
        setHouseNumber('')
        setStreet('')
        setCity('')
        setCountry('NL')
        return
      }
      setFirstName(addr.first_name ?? '')
      setLastName(addr.last_name ?? '')
      setPhone(addr.phone ?? '')
      prefillAddressFromLine(
        addr.address_1 ?? '',
        addr.postal_code ?? '',
        addr.city ?? '',
        addr.country_code ?? 'nl'
      )
    },
    [prefillAddressFromLine]
  )

  /** Session + edit-mode bootstrap; avoids flashing the email step for logged-in or guest edit flows. */
  useEffect(() => {
    if (customerLoading) return
    if (state !== 'email') {
      setBootstrapping(false)
      return
    }

    let cancelled = false
    let skipBootstrapEnd = false
    ;(async () => {
      try {
        if (customer?.id) {
          const fresh = await commerceClient.getCustomer()
          if (cancelled || !fresh) return
          if (isCustomerProfileComplete(fresh)) {
            if (editingDetails) {
              prefillFromCustomer(fresh)
              setEmail(fresh.email)
              setState('logged_in_details')
              return
            }
            skipBootstrapEnd = true
            const cartId = await ensureCart()
            await commerceClient.syncCartFromCustomer(fresh, cartId)
            if (!cancelled) router.replace('/checkout/betaling')
            return
          }
          prefillFromCustomer(fresh)
          setEmail(fresh.email)
          setState('logged_in_details')
          return
        }

        const cart = await ensureGuestCheckoutCartHydrated()
        if (cancelled || !cart?.email) return

        if (isGuestCartCheckoutReady(cart)) {
          const draft = draftFromCart(cart)
          if (draft) saveCheckoutDraft(draft)
          if (editingDetails) {
            prefillFromCart(cart)
            setState('unknown')
            return
          }
          skipBootstrapEnd = true
          router.replace('/checkout/betaling')
          return
        }

        setEmail(cart.email)
        try {
          const lookup = await commerceClient.customerLookup(cart.email)
          if (cancelled) return
          prefillFromCart(cart)
          if (lookup.exists) {
            setHasPassword(lookup.hasPassword)
            setAuthMode(lookup.hasPassword ? 'password' : 'otp')
            setOtpSent(false)
            setOtpCode('')
            setState('known')
          } else {
            setState('unknown')
          }
        } catch {
          if (!cancelled) {
            prefillFromCart(cart)
            setState('unknown')
          }
        }
      } catch {
        // stay on email step
      } finally {
        if (!cancelled && !skipBootstrapEnd) setBootstrapping(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [customer?.id, customerLoading, state, router, prefillFromCustomer, prefillFromCart, editingDetails])

  async function handleLogout() {
    setBusy(true)
    setError(null)
    try {
      await logout()
      clearCheckoutDraft()
      setState('email')
      setEmail('')
      setPassword('')
      setFirstName('')
      setLastName('')
      setPhone('')
      setStreet('')
      setHouseNumber('')
      setPostalCode('')
      setCity('')
      setCountry('NL')
      setManualAddress(false)
      setNewsletterOptIn(true)
      setHasPassword(true)
      setAuthMode('password')
      setOtpCode('')
      setOtpSent(false)
      setOtpResendCooldown(0)
      setValidity(initialCheckoutGuestValidity())
    } catch {
      showToast('Uitloggen mislukt. Probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  useCountryToggleManualAddress(country, setManualAddress)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Vul je e-mailadres in.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Voer een geldig e-mailadres in.')
      return
    }
    setBusy(true)
    setState('loading')
    try {
      const lookup = await commerceClient.customerLookup(email)
      if (lookup.exists) {
        setHasPassword(lookup.hasPassword)
        setAuthMode(lookup.hasPassword ? 'password' : 'otp')
        setOtpSent(false)
        setOtpCode('')
        setState('known')
      } else {
        setState('unknown')
      }
    } catch {
      setState('email')
      showToast(
        settings.emailStep?.lookupErrorToast ?? 'Kon je e-mailadres niet controleren. Probeer het opnieuw.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function sendOtp() {
    setError(null)
    setBusy(true)
    try {
      await commerceClient.requestOtp(email, 'login')
      setAuthMode('otp')
      setOtpSent(true)
      setOtpResendCooldown(60)
    } catch (err) {
      if (err instanceof Error && err.message === 'OTP_RATE_LIMIT') {
        showToast('Te veel codes aangevraagd. Probeer het later opnieuw.')
      } else {
        showToast('Kon geen code versturen. Probeer het opnieuw.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function continueAfterAuth() {
    await refresh()
    await associateCart(email)
    window.dispatchEvent(new Event('va:customer-updated'))
    const fresh = await commerceClient.getCustomer()
    if (!fresh) {
      setError('Kon je account niet laden. Probeer het opnieuw.')
      return
    }
    if (isCustomerProfileComplete(fresh)) {
      const cartId = await ensureCart()
      await commerceClient.syncCartFromCustomer(fresh, cartId)
      router.push('/checkout/betaling')
    } else {
      prefillFromCustomer(fresh)
      setEmail(fresh.email)
      setState('logged_in_details')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (authMode === 'otp') {
        if (!/^\d{6}$/.test(otpCode.trim())) {
          setError('Vul je 6-cijferige verificatiecode in.')
          return
        }
        await commerceClient.verifyOtp(email, otpCode.trim())
        await continueAfterAuth()
        return
      }

      if (!password) {
        setError('Vul je wachtwoord in.')
        return
      }
      await commerceClient.login(email, password)
      await continueAfterAuth()
    } catch {
      setError(
        authMode === 'otp'
          ? 'De verificatiecode is onjuist of verlopen. Probeer het opnieuw.'
          : 'Wachtwoord is onjuist. Probeer het opnieuw of gebruik een eenmalig wachtwoord.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleGuestContinue(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!firstName.trim()) {
      setError('Voornaam is verplicht.')
      return
    }
    if (!lastName.trim()) {
      setError('Achternaam is verplicht.')
      return
    }
    if (!postalCode.trim() || !houseNumber.trim()) {
      setError('Postcode en huisnummer zijn verplicht.')
      return
    }
    if (!street.trim()) {
      setError('Straatnaam kon niet worden bepaald. Vul het handmatig in.')
      return
    }
    if (!city.trim()) {
      setError('Stad kon niet worden bepaald. Vul het handmatig in.')
      return
    }
    setBusy(true)
    try {
      sessionStorage.setItem(
        'va_checkout_newsletter',
        JSON.stringify({ optIn: newsletterOptIn })
      )
      sessionStorage.removeItem('va_checkout_register')

      await commerceClient.registerPasswordless({
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
        address: {
          address_1: `${street} ${houseNumber}`.trim(),
          postal_code: postalCode,
          city,
          country_code: country.toLowerCase(),
          phone: phone.trim() || undefined,
        },
      })
      await refresh()
      await continueAfterAuth()
    } catch {
      setError('Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLoggedInDetailsContinue(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!firstName.trim()) {
      setError('Voornaam is verplicht.')
      return
    }
    if (!lastName.trim()) {
      setError('Achternaam is verplicht.')
      return
    }
    if (!postalCode.trim() || !houseNumber.trim()) {
      setError('Postcode en huisnummer zijn verplicht.')
      return
    }
    if (!street.trim()) {
      setError('Straatnaam kon niet worden bepaald. Vul het handmatig in.')
      return
    }
    if (!city.trim()) {
      setError('Stad kon niet worden bepaald. Vul het handmatig in.')
      return
    }
    setBusy(true)
    try {
      await commerceClient.updateCustomerProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : { phone: '' }),
      })
      await commerceClient.upsertCheckoutShippingAddress({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        address_1: `${street} ${houseNumber}`.trim(),
        postal_code: postalCode,
        city,
        country_code: country.toLowerCase(),
      })
      await refresh()
      window.dispatchEvent(new Event('va:customer-updated'))
      const fresh = await commerceClient.getCustomer()
      if (!fresh || !isCustomerProfileComplete(fresh)) {
        setError('Kon je gegevens niet opslaan. Probeer het opnieuw.')
        return
      }
      const cartId = await ensureCart()
      await commerceClient.syncCartFromCustomer(fresh, cartId)
      router.push('/checkout/betaling')
    } catch {
      setError('Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  async function ensureCart(): Promise<string> {
    const active = await getActiveCart()
    if (active?.id) return active.id
    const cart = await commerceClient.createCart()
    setCartId(cart.id)
    dispatchCartUpdated()
    return cart.id
  }

  async function associateCart(emailAddr: string) {
    const cart = await getActiveCart()
    if (!cart) return
    await commerceClient.updateCart(cart.id, { email: emailAddr }).catch(() => {})
  }

  const heading = settings.emailStep?.heading ?? 'Inloggen of doorgaan als gast'
  const knownHeading = settings.knownEmail?.heading ?? 'Welkom terug!'
  const unknownHeading = settings.unknownEmail?.heading ?? 'Vul je gegevens in'

  const showBootstrap = bootstrapping && state === 'email'

  return (
    <div className="w-full max-w-none lg:max-w-lg">
      {toast && (
        <div
          className="mb-4 rounded-lg px-4 py-3 bg-red-50 border border-red-200 font-sans text-sm text-red-700"
          role="alert"
        >
          {toast}
        </div>
      )}

      {(showBootstrap || customerLoading) && (
        <div
          className="font-sans text-sm text-va-darkgray py-8"
          aria-busy="true"
          aria-live="polite"
        >
          …
        </div>
      )}

      {!showBootstrap && !customerLoading && (state === 'email' || state === 'loading') && (
        <CheckoutLoginEmailStep
          settings={settings}
          heading={heading}
          email={email}
          onEmailChange={(v) => {
            setEmail(v)
            resetValidity('email')
            setError(null)
          }}
          validateOnBlur={(value) => blurField('email', value)}
          validity={validity.email}
          error={error}
          busy={busy}
          onSubmit={handleEmailSubmit}
        />
      )}

      {!showBootstrap && !customerLoading && state === 'known' && (
        <CheckoutLoginKnownStep
          settings={settings}
          knownHeading={knownHeading}
          email={email}
          hasPassword={hasPassword}
          authMode={authMode}
          password={password}
          otpCode={otpCode}
          otpSent={otpSent}
          otpResendCooldown={otpResendCooldown}
          onPasswordChange={(v) => {
            setPassword(v)
            resetValidity('password')
            setError(null)
          }}
          onOtpCodeChange={(v) => {
            setOtpCode(v)
            setError(null)
          }}
          onBlurPassword={() => blurField('password', password)}
          onBlurOtp={() =>
            setValidity((prev) => ({
              ...prev,
              password:
                /^\d{6}$/.test(otpCode.trim())
                  ? { state: 'valid' }
                  : otpCode.trim()
                    ? { state: 'invalid', message: 'Code moet 6 cijfers zijn' }
                    : { state: 'idle' },
            }))
          }
          passwordValidity={validity.password}
          otpValidity={validity.password}
          error={error}
          busy={busy}
          onSubmit={handleLogin}
          onEditEmail={() => {
            setState('email')
            setError(null)
            setOtpCode('')
            setOtpSent(false)
          }}
          onBackToEmail={() => {
            setState('email')
            setError(null)
            setOtpCode('')
            setOtpSent(false)
          }}
          onSendOtp={() => void sendOtp()}
          onResendOtp={() => void sendOtp()}
          onSwitchToPassword={() => {
            setAuthMode('password')
            setOtpCode('')
            setError(null)
          }}
        />
      )}

      {!showBootstrap && !customerLoading && (state === 'unknown' || state === 'logged_in_details') && (
        <CheckoutGuestDetailsStep
          settings={settings}
          unknownHeading={unknownHeading}
          email={email}
          firstName={firstName}
          lastName={lastName}
          phone={phone}
          street={street}
          houseNumber={houseNumber}
          postalCode={postalCode}
          city={city}
          country={country}
          newsletterOptIn={newsletterOptIn}
          busy={busy}
          error={error}
          addressLookup={addressLookup}
          manualAddress={manualAddress}
          validity={validity}
          onEditEmail={
            editingDetails || state === 'logged_in_details'
              ? undefined
              : () => {
                  setState('email')
                  setError(null)
                }
          }
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onPhoneChange={setPhone}
          onPostalCodeChange={setPostalCode}
          onHouseNumberChange={setHouseNumber}
          onStreetChange={setStreet}
          onCityChange={setCity}
          onCountryChange={(v) => {
            setCountry(v)
            resetValidity('postalCode')
          }}
          onNewsletterOptInChange={setNewsletterOptIn}
          onManualAddress={setManualAddress}
          blur={blurField}
          reset={resetValidity}
          onSubmit={state === 'logged_in_details' ? handleLoggedInDetailsContinue : handleGuestContinue}
          onLogout={state === 'logged_in_details' && editingDetails ? handleLogout : undefined}
          backHref={editingDetails ? '/checkout/betaling' : undefined}
          backLabel={editingDetails ? 'Terug naar betaling' : undefined}
        />
      )}
    </div>
  )
}
