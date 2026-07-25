'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackUpdateAccountInfo } from '@/lib/analytics/events/ecommerce'
import { commerceClient } from '@/lib/commerce'
import { getDefaultCheckoutAddress, splitAddressLine } from '@/lib/commerce/checkout-profile'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { NlAddressFields } from '@/components/address/NlAddressFields'
import { ValidatedInput } from '@/components/auth/ValidatedInput'
import {
  initialCheckoutGuestValidity,
  validateAccountField,
  type AccountFieldName,
  type CheckoutGuestValidity,
} from '@/lib/auth/account-field-validation'
import { useCountryToggleManualAddress } from '@/lib/address/useCountryToggleManualAddress'
import { usePdokAddressLookup } from '@/lib/address/usePdokAddressLookup'
import { Button } from '@/components/ui/Button'
import { defaultMessages } from '@/lib/i18n/messages'
import { readCustomerBirthdate } from '@/lib/commerce/customer-birthdate'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal'

export function AccountGegevensForm() {
  const { customer, loading, refresh } = useCustomer()
  const searchParams = useSearchParams()
  const t = defaultMessages.accountPage
  const common = defaultMessages.common

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('NL')
  const [manualAddress, setManualAddress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [hasPassword, setHasPassword] = useState(true)
  const [validity, setValidity] = useState<CheckoutGuestValidity>(() => initialCheckoutGuestValidity())

  useEffect(() => {
    if (!customer?.id) return
    commerceClient
      .getAuthStatus()
      .then((status) => setHasPassword(status.hasPassword))
      .catch(() => setHasPassword(true))
  }, [customer?.id])

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
    if (!customer) return
    setFirstName(customer.first_name?.trim() ?? '')
    setLastName(customer.last_name?.trim() ?? '')
    setPhone(customer.phone?.trim() ?? '')
    setBirthdate(readCustomerBirthdate(customer.metadata))
    const addr = getDefaultCheckoutAddress(customer)
    if (!addr) {
      setStreet('')
      setHouseNumber('')
      setPostalCode('')
      setCity('')
      setCountry('NL')
      setManualAddress(false)
      setValidity(initialCheckoutGuestValidity())
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
    } else if (hn) {
      setManualAddress(false)
      setStreet(st)
      setHouseNumber(hn)
    } else {
      setManualAddress(true)
      setStreet(st)
      setHouseNumber('')
    }
    setValidity(initialCheckoutGuestValidity())
  }, [customer])

  useEffect(() => {
    if (searchParams.get('wachtwoord') === '1') {
      setPasswordOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!saveSuccess) return
    const id = setTimeout(() => setSaveSuccess(false), 5000)
    return () => clearTimeout(id)
  }, [saveSuccess])

  function resetValidity(name: AccountFieldName) {
    setValidity((prev) => (prev[name].state === 'idle' ? prev : { ...prev, [name]: { state: 'idle' } }))
  }

  function blurField(name: AccountFieldName, value: string) {
    setValidity((prev) => ({
      ...prev,
      [name]: validateAccountField(name, value, { countryCode: country }),
    }))
  }

  function validateForm(): boolean {
    const checks: { name: AccountFieldName; value: string }[] = [
      { name: 'firstName', value: firstName },
      { name: 'lastName', value: lastName },
      { name: 'phone', value: phone },
      { name: 'birthdate', value: birthdate },
      { name: 'postalCode', value: postalCode },
      { name: 'houseNumber', value: houseNumber },
      { name: 'street', value: street },
      { name: 'city', value: city },
    ]
    const next = { ...validity }
    let ok = true
    for (const { name, value } of checks) {
      const r = validateAccountField(name, value, { countryCode: country })
      next[name] = r
      if (r.state === 'invalid') ok = false
    }
    setValidity(next)
    return ok
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaveSuccess(false)
    if (!validateForm()) {
      setError(t.formValidationHint)
      return
    }
    setBusy(true)
    try {
      const address1 = [street.trim(), houseNumber.trim()].filter(Boolean).join(' ')
      await commerceClient.updateCustomerProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : { phone: '' }),
        birthdate,
      })
      await commerceClient.upsertCheckoutShippingAddress({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        address_1: address1,
        postal_code: postalCode.trim(),
        city: city.trim(),
        country_code: country.toLowerCase(),
      })
      await refresh()
      window.dispatchEvent(new Event('va:customer-updated'))
      trackUpdateAccountInfo(
        ['naam', 'telefoonnummer', 'geboortedatum', 'adres'],
        customer?.email ?? ''
      )
      setSaveSuccess(true)
    } catch {
      setError(t.saveProfileError)
    } finally {
      setBusy(false)
    }
  }

  if (loading || !customer) {
    return (
      <p className="font-sans text-va-darkgray" aria-busy="true">
        {common.loadingEllipsis}
      </p>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-4" noValidate>
          <ValidatedInput
            name="firstName"
            label={t.firstNameLabel}
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(v) => {
              setFirstName(v)
              resetValidity('firstName')
            }}
            onBlur={() => blurField('firstName', firstName)}
            validity={validity.firstName}
            disabled={busy}
          />
          <ValidatedInput
            name="lastName"
            label={t.lastNameLabel}
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(v) => {
              setLastName(v)
              resetValidity('lastName')
            }}
            onBlur={() => blurField('lastName', lastName)}
            validity={validity.lastName}
            disabled={busy}
          />
          <ValidatedInput
            name="email"
            label={t.emailLabel}
            type="email"
            autoComplete="email"
            value={customer.email}
            onChange={() => {}}
            onBlur={() => {}}
            validity={{ state: 'idle' }}
            disabled
          />
          <ValidatedInput
            name="phone"
            label={t.phoneLabel}
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(v) => {
              setPhone(v)
              resetValidity('phone')
            }}
            onBlur={() => blurField('phone', phone)}
            validity={validity.phone}
            disabled={busy}
          />
          <ValidatedInput
            name="birthdate"
            label={t.birthdateLabel}
            type="date"
            autoComplete="bday"
            value={birthdate}
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
            onChange={(v) => {
              setBirthdate(v)
              resetValidity('birthdate')
            }}
            onBlur={() => blurField('birthdate', birthdate)}
            validity={validity.birthdate}
            disabled={busy}
          />

          <div className="pt-2 border-t border-va-lightgray">
            <NlAddressFields
              sectionTitle={t.addressSectionTitle}
              labels={{
                postalCode: t.postalCodeLabel,
                houseNumber: t.houseNumberLabel,
                street: t.streetLabel,
                city: t.cityLabel,
                country: t.countryLabel,
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
                postalCode: validity.postalCode,
                houseNumber: validity.houseNumber,
                street: validity.street,
                city: validity.city,
              }}
              onPostalCodeChange={setPostalCode}
              onHouseNumberChange={setHouseNumber}
              onStreetChange={setStreet}
              onCityChange={setCity}
              onCountryChange={(v) => {
                setCountry(v)
                resetValidity('postalCode')
              }}
              onManualAddress={setManualAddress}
              blur={(name, value) => blurField(name, value)}
              reset={resetValidity}
            />
          </div>

          {saveSuccess ? (
            <p
              className="font-sans text-sm text-green-800 px-3 py-2 bg-green-50 border border-green-200 rounded-none"
              role="status"
              aria-live="polite"
            >
              {t.saveProfileSuccess}
            </p>
          ) : null}
          {error ? (
            <p className="font-sans text-sm text-va-orange" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="primary" size="md" disabled={busy}>
              {busy ? common.loading : t.saveProfile}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setPasswordOpen(true)}
              disabled={busy}
            >
              {hasPassword ? t.passwordChange : t.passwordSet}
            </Button>
          </div>
        </form>
      </div>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  )
}
