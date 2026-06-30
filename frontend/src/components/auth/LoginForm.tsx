'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { commerceClient } from '@/lib/commerce'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { OtpCodeInput } from '@/components/auth/OtpCodeInput'
import type { GeneralSettings } from '@/lib/cms/types'
import { validateAccountField, type AccountFieldName, type FieldValidity } from '@/lib/auth/account-field-validation'
import { useCountryToggleManualAddress } from '@/lib/address/useCountryToggleManualAddress'
import { usePdokAddressLookup } from '@/lib/address/usePdokAddressLookup'
import { NlAddressFields } from '@/components/address/NlAddressFields'
import { ValidatedInput } from '@/components/auth/ValidatedInput'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'

type AccountSettings = NonNullable<GeneralSettings['account']>

interface LoginFormProps {
  settings: AccountSettings
}

/** Register + address steps (no `newPassword`; checkout guest flow uses that alias). */
type LoginFormValidityKey = Exclude<AccountFieldName, 'newPassword'>

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'h-1 rounded-full flex-1 transition-colors',
            i < current ? 'bg-va-black' : i === current ? 'bg-va-yellow' : 'bg-va-lightgray-300',
          )}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Mode = 'login' | 'register'
type RegisterStep = 1 | 2 | 3
type LoginStep = 'email' | 'auth'
type AuthMode = 'password' | 'otp'

export function LoginForm({ settings }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams?.get('returnTo') ?? '/mijn-account'
  const { login, register, refresh } = useCustomer()

  const [mode, setMode] = useState<Mode>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Login state
  const [loginStep, setLoginStep] = useState<LoginStep>('email')
  const [loginEmail, setLoginEmail] = useState('')
  const [hasPassword, setHasPassword] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('password')
  const [loginPassword, setLoginPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpResendCooldown, setOtpResendCooldown] = useState(0)

  // ── Register state
  const [regStep, setRegStep] = useState<RegisterStep>(1)

  // Step 1 — account
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')
  const [birthdate, setBirthdate] = useState('')

  // Step 2 — address
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('NL')
  const [manualAddress, setManualAddress] = useState(false)

  const [validity, setValidity] = useState<Record<LoginFormValidityKey, FieldValidity>>(() => ({
    email: { state: 'idle' },
    password: { state: 'idle' },
    confirmPassword: { state: 'idle' },
    firstName: { state: 'idle' },
    lastName: { state: 'idle' },
    phone: { state: 'idle' },
    postalCode: { state: 'idle' },
    houseNumber: { state: 'idle' },
    street: { state: 'idle' },
    city: { state: 'idle' },
    birthdate: { state: 'idle' },
  }))

  function v(name: LoginFormValidityKey) {
    return validity[name]
  }
  function touch(name: LoginFormValidityKey, value: string, extra?: { password?: string }) {
    setValidity((prev) => ({
      ...prev,
      [name]: validateAccountField(name, value, { ...extra, countryCode: country }),
    }))
  }
  function reset(name: LoginFormValidityKey) {
    setValidity((prev) => (prev[name].state === 'idle' ? prev : { ...prev, [name]: { state: 'idle' } }))
  }

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

  useCountryToggleManualAddress(country, setManualAddress)

  useEffect(() => {
    if (otpResendCooldown <= 0) return
    const timer = window.setTimeout(() => {
      setOtpResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [otpResendCooldown])

  useEffect(() => {
    if (mode !== 'login' || loginStep !== 'auth' || hasPassword || otpSent || busy) return
    void sendLoginOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loginStep, hasPassword, otpSent, busy])

  function switchMode(next: 'login' | 'register') {
    setError(null)
    setRegStep(1)
    setLoginStep('email')
    setOtpCode('')
    setOtpSent(false)
    setMode(next)
  }

  async function sendLoginOtp() {
    setError(null)
    setBusy(true)
    try {
      await commerceClient.requestOtp(loginEmail, 'login')
      setAuthMode('otp')
      setOtpSent(true)
      setOtpResendCooldown(60)
    } catch {
      setError('Kon geen code versturen. Probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLoginEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!loginEmail.trim()) {
      setError('Dit veld is verplicht.')
      return
    }
    setBusy(true)
    try {
      const lookup = await commerceClient.customerLookup(loginEmail)
      if (!lookup.exists) {
        setError('We kennen dit e-mailadres nog niet. Maak een account aan.')
        return
      }
      setHasPassword(lookup.hasPassword)
      setAuthMode(lookup.hasPassword ? 'password' : 'otp')
      setOtpSent(false)
      setOtpCode('')
      setLoginStep('auth')
    } catch {
      setError('Kon je e-mailadres niet controleren. Probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  // ── Handlers

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
        await commerceClient.verifyOtp(loginEmail, otpCode.trim())
        await refresh()
        window.dispatchEvent(new Event('va:customer-updated'))
        router.push(returnTo)
        return
      }

      if (!loginPassword) {
        setError('Dit veld is verplicht.')
        return
      }
      await login(loginEmail, loginPassword)
      router.push(returnTo)
    } catch {
      setError(
        authMode === 'otp'
          ? 'De verificatiecode is onjuist of verlopen.'
          : 'E-mailadres of wachtwoord is onjuist.'
      )
    } finally {
      setBusy(false)
    }
  }

  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fields: LoginFormValidityKey[] = [
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
    ]
    const values: Record<string, string> = {
      firstName,
      lastName,
      email: regEmail,
      password: regPassword,
      confirmPassword: regPasswordConfirm,
    }
    let hasError = false
    const next = { ...validity }
    for (const f of fields) {
      const val = validateAccountField(f, values[f] ?? '', { password: regPassword })
      next[f] = val
      if (val.state === 'invalid') hasError = true
    }
    setValidity(next)
    if (hasError) return
    setRegStep(2)
  }

  async function handleStep2Next(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const phoneVal = validateAccountField('phone', phone, { countryCode: country })
    const birthdateVal = birthdate.trim()
      ? validateAccountField('birthdate', birthdate)
      : { state: 'idle' as const }
    const pcVal = validateAccountField('postalCode', postalCode, { countryCode: country })
    const hnVal = validateAccountField('houseNumber', houseNumber, { countryCode: country })
    const stVal = validateAccountField('street', street, { countryCode: country })
    const ctVal = validateAccountField('city', city, { countryCode: country })
    setValidity((prev) => ({
      ...prev,
      phone: phoneVal,
      birthdate: birthdateVal,
      postalCode: pcVal,
      houseNumber: hnVal,
      street: stVal,
      city: ctVal,
    }))
    if ([phoneVal, birthdateVal, pcVal, hnVal, stVal, ctVal].some((v) => v.state === 'invalid')) return
    setRegStep(3)
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await register({
        email: regEmail,
        password: regPassword,
        first_name: firstName,
        last_name: lastName,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(birthdate.trim() ? { birthdate } : {}),
        address: {
          address_1: `${street} ${houseNumber}`.trim(),
          postal_code: postalCode.replace(/\s/g, '').toUpperCase().replace(/^(\d{4})([a-zA-Z]{2})$/, '$1 $2'),
          city,
          country_code: country.toLowerCase(),
        },
      })
      router.push(returnTo)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('already')
          ? 'Er bestaat al een account met dit e-mailadres.'
          : 'Registreren mislukt. Probeer het opnieuw.'
      )
    } finally {
      setBusy(false)
    }
  }

  // ── Login / register view

  return (
    <div className="max-w-sm space-y-6">
      {/* Tab switcher */}
      <div className="flex border-b border-va-lightgray-300">
        {(['login', 'register'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchMode(tab)}
            className={clsx(
              'flex-1 pb-2 font-sans text-sm font-semibold transition-colors',
              mode === tab
                ? 'border-b-2 border-va-black text-va-black -mb-px'
                : 'text-va-darkgray hover:text-va-black',
            )}
          >
            {tab === 'login' ? (settings.loginHeading ?? 'Inloggen') : 'Account aanmaken'}
          </button>
        ))}
      </div>

      {/* ── Login */}
      {mode === 'login' && loginStep === 'email' && (
        <>
          {settings.loginIntro && <p className="font-sans text-sm text-va-darkgray">{settings.loginIntro}</p>}
          <form onSubmit={handleLoginEmailSubmit} noValidate className="space-y-4">
            <div>
              <label className="block font-sans text-sm font-medium text-va-black mb-1" htmlFor="login-email">
                {settings.emailLabel ?? 'E-mailadres'}
              </label>
              <input
                id="login-email" type="email" autoComplete="email"
                value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full border border-va-lightgray-300 px-3 py-2 font-sans text-sm focus:outline-none focus:border-va-black"
                disabled={busy}
              />
              {error && <p className="font-sans text-xs text-red-600 mt-1">{error}</p>}
            </div>
            <button type="submit" disabled={busy} className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60">
              {busy ? '…' : 'Volgende'}
            </button>
          </form>
        </>
      )}

      {mode === 'login' && loginStep === 'auth' && (
        <>
          <p className="font-sans text-sm text-va-darkgray">{loginEmail}</p>
          {authMode === 'otp' && otpSent && (
            <p className="font-sans text-sm text-va-darkgray">
              Er is een eenmalig wachtwoord verstuurd naar je e-mailadres.
            </p>
          )}
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            {authMode === 'password' && (
              <div>
                <label className="block font-sans text-sm font-medium text-va-black mb-1" htmlFor="login-password">
                  {settings.passwordLabel ?? 'Wachtwoord'}
                </label>
                <input
                  id="login-password" type="password" autoComplete="current-password"
                  value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full border border-va-lightgray-300 px-3 py-2 font-sans text-sm focus:outline-none focus:border-va-black"
                  disabled={busy}
                />
              </div>
            )}
            {authMode === 'otp' && (
              <OtpCodeInput
                label="Verificatiecode"
                value={otpCode}
                onChange={setOtpCode}
                disabled={busy}
                onResend={() => void sendLoginOtp()}
                resendDisabled={busy || otpResendCooldown > 0}
                resendCooldownSeconds={otpResendCooldown}
              />
            )}
            {error && <p className="font-sans text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60">
              {busy ? '…' : (settings.loginCtaLabel ?? 'Inloggen')}
            </button>
          </form>
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-sans text-xs">
            {hasPassword && authMode === 'password' && (
              <button
                type="button"
                onClick={() => void sendLoginOtp()}
                disabled={busy}
                className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors disabled:opacity-60"
              >
                Eenmalig wachtwoord sturen
              </button>
            )}
            {hasPassword && authMode === 'otp' && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password')
                  setOtpCode('')
                  setError(null)
                }}
                disabled={busy}
                className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors disabled:opacity-60"
              >
                Wachtwoord gebruiken
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setLoginStep('email')
                setError(null)
                setOtpCode('')
                setOtpSent(false)
              }}
              className="text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
            >
              Terug
            </button>
          </div>
        </>
      )}

      {/* ── Register */}
      {mode === 'register' && (
        <div className="space-y-5">
          <StepIndicator current={regStep - 1} total={3} />

          {/* Step 1: Account */}
          {regStep === 1 && (
            <form onSubmit={handleStep1Next} noValidate className="space-y-4">
              <p className="font-sans text-xs text-va-darkgray">Stap 1 van 3 — Accountgegevens</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <ValidatedInput
                    id="reg-first-name" name="firstName" label="Voornaam" required
                    autoComplete="given-name" value={firstName}
                    onChange={(v) => { setFirstName(v); reset('firstName') }}
                    onBlur={() => touch('firstName', firstName)}
                    validity={v('firstName')} disabled={busy}
                  />
                </div>
                <div className="flex-1">
                  <ValidatedInput
                    id="reg-last-name" name="lastName" label="Achternaam" required
                    autoComplete="family-name" value={lastName}
                    onChange={(v) => { setLastName(v); reset('lastName') }}
                    onBlur={() => touch('lastName', lastName)}
                    validity={v('lastName')} disabled={busy}
                  />
                </div>
              </div>
              <ValidatedInput
                id="reg-email" name="email" label={settings.emailLabel ?? 'E-mailadres'} required
                type="email" autoComplete="email" value={regEmail}
                onChange={(val) => { setRegEmail(val); reset('email') }}
                onBlur={() => touch('email', regEmail)}
                validity={v('email')} disabled={busy}
              />
              <div>
                <ValidatedInput
                  id="reg-password" name="password" label={settings.passwordLabel ?? 'Wachtwoord'} required
                  type="password" autoComplete="new-password" value={regPassword}
                  onChange={(val) => { setRegPassword(val); reset('password'); if (regPasswordConfirm) reset('confirmPassword') }}
                  onBlur={() => touch('password', regPassword)}
                  validity={v('password')} disabled={busy}
                />
                <PasswordStrengthMeter password={regPassword} />
              </div>
              <ValidatedInput
                id="reg-password-confirm" name="confirmPassword" label="Wachtwoord bevestigen" required
                type="password" autoComplete="new-password" value={regPasswordConfirm}
                onChange={(val) => { setRegPasswordConfirm(val); reset('confirmPassword') }}
                onBlur={() => touch('confirmPassword', regPasswordConfirm, { password: regPassword })}
                validity={v('confirmPassword')} disabled={busy}
              />
              <button type="submit" disabled={busy} className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60">
                Volgende
              </button>
            </form>
          )}

          {/* Step 2: Address */}
          {regStep === 2 && (
            <form onSubmit={handleStep2Next} noValidate className="space-y-4">
              <p className="font-sans text-xs text-va-darkgray">Stap 2 van 3 — Adresgegevens</p>
              <ValidatedInput
                id="reg-phone" name="phone" label="Telefoonnummer"
                type="tel" autoComplete="tel" value={phone}
                onChange={(v) => { setPhone(v); reset('phone') }}
                onBlur={() => touch('phone', phone)}
                validity={v('phone')} disabled={busy}
              />
              <ValidatedInput
                id="reg-birthdate" name="birthdate" label="Geboortedatum"
                type="date" autoComplete="bday" value={birthdate}
                max={new Date().toISOString().slice(0, 10)}
                min="1900-01-01"
                onChange={(v) => { setBirthdate(v); reset('birthdate') }}
                onBlur={() => touch('birthdate', birthdate)}
                validity={v('birthdate')} disabled={busy}
              />
              <NlAddressFields
                labels={{
                  postalCode: 'Postcode',
                  houseNumber: 'Huisnummer',
                  street: 'Straat',
                  city: 'Stad',
                  country: 'Land',
                }}
                postalCode={postalCode}
                houseNumber={houseNumber}
                street={street}
                city={city}
                country={country}
                manualAddress={manualAddress}
                addressLookup={addressLookup}
                busy={busy}
                validity={{
                  postalCode: v('postalCode'),
                  houseNumber: v('houseNumber'),
                  street: v('street'),
                  city: v('city'),
                }}
                onPostalCodeChange={setPostalCode}
                onHouseNumberChange={setHouseNumber}
                onStreetChange={setStreet}
                onCityChange={setCity}
                onCountryChange={(v) => {
                  setCountry(v)
                  reset('postalCode')
                }}
                onManualAddress={setManualAddress}
                blur={(name, value) => touch(name, value)}
                reset={(name) => {
                  if (name === 'postalCode' || name === 'houseNumber' || name === 'street' || name === 'city') {
                    reset(name)
                  }
                }}
              />

              {error && <p className="font-sans text-xs text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60">
                Volgende
              </button>
              <button type="button" onClick={() => { setError(null); setRegStep(1) }} className="font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors">
                Terug
              </button>
            </form>
          )}

          {/* Step 3: Confirm */}
          {regStep === 3 && (
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
              <p className="font-sans text-xs text-va-darkgray">Stap 3 van 3 — Controleer je gegevens</p>
              <div className="space-y-2 p-4 bg-va-lightgray-100 border border-va-lightgray-300 font-sans text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-va-black">
                  <span className="text-va-darkgray">Naam</span>
                  <span>{firstName} {lastName}</span>
                  <span className="text-va-darkgray">E-mail</span>
                  <span>{regEmail}</span>
                  {phone && <><span className="text-va-darkgray">Telefoon</span><span>{phone}</span></>}
                  {birthdate && <><span className="text-va-darkgray">Geboortedatum</span><span>{birthdate}</span></>}
                  <span className="text-va-darkgray">Adres</span>
                  <span>
                    {street} {houseNumber},<br />
                    {postalCode.replace(/\s/g, '').toUpperCase().replace(/^(\d{4})([a-zA-Z]{2})$/, '$1 $2')} {city}
                  </span>
                </div>
              </div>
              {error && <p className="font-sans text-xs text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60">
                {busy ? '…' : 'Account aanmaken'}
              </button>
              <button type="button" onClick={() => { setError(null); setRegStep(2) }} className="font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors">
                Terug
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
