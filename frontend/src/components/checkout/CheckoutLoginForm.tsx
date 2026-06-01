'use client'

/**
 * Checkout identity step: email lookup → login | guest details (+ optional account).
 * Shared pieces: `ValidatedInput`, `PasswordStrengthMeter`, `validateAccountField` (see `@/lib/auth`, `@/components/auth`).
 * Step UI lives under `components/checkout/login/`.
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { commerceClient } from '@/lib/commerce'
import {
  getDefaultCheckoutAddress,
  isCustomerProfileComplete,
  splitAddressLine,
} from '@/lib/commerce/checkout-profile'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { getCartId, setCartId } from '@/lib/commerce/cart'
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

interface CheckoutLoginFormProps {
  settings: CheckoutSettings
}

export function CheckoutLoginForm({ settings }: CheckoutLoginFormProps) {
  const router = useRouter()
  const { customer, refresh, loading: customerLoading } = useCustomer()
  const [state, setState] = useState<State>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('NL')
  const [createAccount, setCreateAccount] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [manualAddress, setManualAddress] = useState(false)
  const [validity, setValidity] = useState<CheckoutGuestValidity>(() => initialCheckoutGuestValidity())

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
        ? { ...extra, passwordRequirement: 'login' as const }
        : name === 'confirmPassword'
          ? { password: extra?.password ?? newPassword }
          : extra
    setValidity((prev) => ({ ...prev, [name]: validateAccountField(name, value, opts) }))
  }

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
    setPostalCode(addr.postal_code ?? '')
    setCity(addr.city ?? '')
    const countryUpper = (addr.country_code ?? 'nl').toUpperCase()
    setCountry(countryUpper)
    const line = addr.address_1 ?? ''
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
  }, [])

  /** Already logged in (e.g. opened checkout): sync or show gegevens. `known` is handled in handleLogin only. */
  useEffect(() => {
    if (customerLoading || !customer?.id) return
    if (state === 'known') return

    let cancelled = false
    ;(async () => {
      try {
        const fresh = await commerceClient.getCustomer()
        if (cancelled || !fresh) return
        if (isCustomerProfileComplete(fresh)) {
          const cartId = await ensureCart()
          await commerceClient.syncCartFromCustomer(fresh, cartId)
          if (!cancelled) router.replace('/checkout/betaling')
          return
        }
        if (state === 'email' || state === 'loading') {
          prefillFromCustomer(fresh)
          setEmail(fresh.email)
          setState('logged_in_details')
        }
      } catch {
        // stay on current step
      }
    })()
    return () => {
      cancelled = true
    }
  }, [customer?.id, customerLoading, state, router, prefillFromCustomer])

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
      const exists = await commerceClient.customerExists(email)
      setState(exists ? 'known' : 'unknown')
    } catch {
      setState('email')
      showToast(
        settings.emailStep?.lookupErrorToast ?? 'Kon je e-mailadres niet controleren. Probeer het opnieuw.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!password) {
      setError('Vul je wachtwoord in.')
      return
    }
    setBusy(true)
    try {
      await commerceClient.login(email, password)
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
    } catch {
      setError('Wachtwoord is onjuist. Probeer het opnieuw of kies een andere optie.')
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
    if (createAccount) {
      if (newPassword.length < 8) {
        setError('Wachtwoord moet minimaal 8 tekens bevatten.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Wachtwoorden komen niet overeen.')
        return
      }
    }
    setBusy(true)
    try {
      const cartId = await ensureCart()
      await commerceClient.updateCart(cartId, {
        email,
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined,
          address_1: `${street} ${houseNumber}`.trim(),
          postal_code: postalCode,
          city,
          country_code: country.toLowerCase(),
        },
      })
      if (createAccount) {
        sessionStorage.setItem(
          'va_checkout_register',
          JSON.stringify({
            email,
            password: newPassword,
            first_name: firstName,
            last_name: lastName,
            phone: phone || undefined,
          })
        )
      }
      router.push('/checkout/betaling')
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
    let cartId = getCartId()
    if (!cartId) {
      const cart = await commerceClient.createCart()
      setCartId(cart.id)
      cartId = cart.id
    }
    return cartId
  }

  async function associateCart(emailAddr: string) {
    const cartId = getCartId()
    if (!cartId) return
    await commerceClient.updateCart(cartId, { email: emailAddr }).catch(() => {})
  }

  const heading = settings.emailStep?.heading ?? 'Inloggen of doorgaan als gast'
  const knownHeading = settings.knownEmail?.heading ?? 'Welkom terug!'
  const unknownHeading = settings.unknownEmail?.heading ?? 'Vul je gegevens in'

  return (
    <div className="w-full max-w-none lg:max-w-lg">
      {toast && (
        <div
          className="mb-4 px-4 py-3 bg-red-50 border border-red-200 font-sans text-sm text-red-700"
          role="alert"
        >
          {toast}
        </div>
      )}

      {(state === 'email' || state === 'loading') && (
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

      {state === 'known' && (
        <CheckoutLoginKnownStep
          settings={settings}
          knownHeading={knownHeading}
          email={email}
          password={password}
          onPasswordChange={(v) => {
            setPassword(v)
            resetValidity('password')
            setError(null)
          }}
          onBlurPassword={() => blurField('password', password)}
          passwordValidity={validity.password}
          error={error}
          busy={busy}
          onSubmit={handleLogin}
          onEditEmail={() => {
            setState('email')
            setError(null)
          }}
          onBackToEmail={() => {
            setState('email')
            setError(null)
          }}
          onGuestContinue={() => setState('unknown')}
          showToast={showToast}
        />
      )}

      {(state === 'unknown' || state === 'logged_in_details') && (
        <CheckoutGuestDetailsStep
          settings={settings}
          unknownHeading={unknownHeading}
          showCreateAccountOption={state !== 'logged_in_details'}
          email={email}
          firstName={firstName}
          lastName={lastName}
          phone={phone}
          street={street}
          houseNumber={houseNumber}
          postalCode={postalCode}
          city={city}
          country={country}
          createAccount={createAccount}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          busy={busy}
          error={error}
          addressLookup={addressLookup}
          manualAddress={manualAddress}
          validity={validity}
          onEditEmail={
            state === 'logged_in_details'
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
          onCountryChange={setCountry}
          onCreateAccountChange={setCreateAccount}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onManualAddress={setManualAddress}
          blur={blurField}
          reset={resetValidity}
          onSubmit={state === 'logged_in_details' ? handleLoggedInDetailsContinue : handleGuestContinue}
        />
      )}
    </div>
  )
}
