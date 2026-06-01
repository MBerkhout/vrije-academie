'use client'

import Link from 'next/link'
import type { GeneralSettings } from '@/lib/cms/types'
import { NlAddressFields } from '@/components/address/NlAddressFields'
import { ValidatedInput } from '@/components/auth/ValidatedInput'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import type { AccountFieldName, CheckoutGuestValidity } from '@/lib/auth/account-field-validation'
import { EmailRow } from './EmailRow'

export type { CheckoutGuestValidity } from '@/lib/auth/account-field-validation'

type CheckoutSettings = NonNullable<GeneralSettings['checkout']>

interface CheckoutGuestDetailsStepProps {
  settings: CheckoutSettings
  unknownHeading: string
  /** When false (logged-in checkout), hides optional account creation and passwords. */
  showCreateAccountOption?: boolean
  email: string
  firstName: string
  lastName: string
  phone: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
  createAccount: boolean
  newPassword: string
  confirmPassword: string
  busy: boolean
  error: string | null
  addressLookup: 'idle' | 'loading' | 'found' | 'error'
  manualAddress: boolean
  validity: CheckoutGuestValidity
  /** When omitted, e-mail is not editable from this step (logged-in checkout). */
  onEditEmail?: () => void
  onFirstNameChange: (v: string) => void
  onLastNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onPostalCodeChange: (v: string) => void
  onHouseNumberChange: (v: string) => void
  onStreetChange: (v: string) => void
  onCityChange: (v: string) => void
  onCountryChange: (v: string) => void
  onCreateAccountChange: (v: boolean) => void
  onNewPasswordChange: (v: string) => void
  onConfirmPasswordChange: (v: string) => void
  onManualAddress: (v: boolean) => void
  blur: (name: AccountFieldName, value: string, extra?: { password?: string }) => void
  reset: (name: AccountFieldName) => void
  onSubmit: (e: React.FormEvent) => void
}

export function CheckoutGuestDetailsStep({
  settings,
  unknownHeading,
  showCreateAccountOption = true,
  email,
  firstName,
  lastName,
  phone,
  street,
  houseNumber,
  postalCode,
  city,
  country,
  createAccount,
  newPassword,
  confirmPassword,
  busy,
  error,
  addressLookup,
  manualAddress,
  validity,
  onEditEmail,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onPostalCodeChange,
  onHouseNumberChange,
  onStreetChange,
  onCityChange,
  onCountryChange,
  onCreateAccountChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onManualAddress,
  blur,
  reset,
  onSubmit,
}: CheckoutGuestDetailsStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h1 className="font-sans text-xl font-bold text-va-black">{unknownHeading}</h1>
      <EmailRow email={email} onEdit={onEditEmail} />

      {error && <p className="font-sans text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <ValidatedInput
          name="firstName"
          label={settings.unknownEmail?.firstNameLabel ?? 'Voornaam'}
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(v) => {
            onFirstNameChange(v)
            reset('firstName')
          }}
          onBlur={() => blur('firstName', firstName)}
          validity={validity.firstName}
          disabled={busy}
        />
        <ValidatedInput
          name="lastName"
          label={settings.unknownEmail?.lastNameLabel ?? 'Achternaam'}
          required
          autoComplete="family-name"
          value={lastName}
          onChange={(v) => {
            onLastNameChange(v)
            reset('lastName')
          }}
          onBlur={() => blur('lastName', lastName)}
          validity={validity.lastName}
          disabled={busy}
        />
      </div>

      <ValidatedInput
        name="phone"
        label={settings.unknownEmail?.phoneLabel ?? 'Telefoonnummer'}
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={(v) => {
          onPhoneChange(v)
          reset('phone')
        }}
        onBlur={() => blur('phone', phone)}
        validity={validity.phone}
        disabled={busy}
      />

      <NlAddressFields
        labels={{
          postalCode: settings.unknownEmail?.postalCodeLabel ?? 'Postcode',
          houseNumber: settings.unknownEmail?.houseNumberLabel ?? 'Huisnummer',
          street: settings.unknownEmail?.streetLabel ?? 'Straat',
          city: settings.unknownEmail?.cityLabel ?? 'Stad',
          country: settings.unknownEmail?.countryLabel ?? 'Land',
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
        onPostalCodeChange={onPostalCodeChange}
        onHouseNumberChange={onHouseNumberChange}
        onStreetChange={onStreetChange}
        onCityChange={onCityChange}
        onCountryChange={onCountryChange}
        onManualAddress={onManualAddress}
        blur={(name, value) => blur(name, value)}
        reset={reset}
      />

      {showCreateAccountOption && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createAccount}
              onChange={(e) => onCreateAccountChange(e.target.checked)}
              className="w-4 h-4 accent-va-yellow"
              disabled={busy}
            />
            <span className="font-sans text-sm text-va-black">
              {settings.unknownEmail?.createAccountLabel ?? 'Account aanmaken (optioneel)'}
            </span>
          </label>
        </div>
      )}

      {showCreateAccountOption && createAccount && (
        <div className="space-y-3 pl-6 border-l-2 border-va-yellow">
          <div>
            <ValidatedInput
              name="newPassword"
              label={settings.unknownEmail?.passwordLabel ?? 'Wachtwoord'}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(v) => {
                onNewPasswordChange(v)
                reset('newPassword')
                if (confirmPassword) reset('confirmPassword')
              }}
              onBlur={() => blur('newPassword', newPassword)}
              validity={validity.newPassword}
              disabled={busy}
            />
            <PasswordStrengthMeter password={newPassword} />
          </div>
          <ValidatedInput
            name="confirmPassword"
            label={settings.unknownEmail?.confirmPasswordLabel ?? 'Wachtwoord bevestigen'}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(v) => {
              onConfirmPasswordChange(v)
              reset('confirmPassword')
            }}
            onBlur={() => blur('confirmPassword', confirmPassword, { password: newPassword })}
            validity={validity.confirmPassword}
            disabled={busy}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-va-yellow text-va-black font-sans font-semibold text-sm px-6 py-3 hover:bg-va-yellow/90 transition-colors disabled:opacity-60"
      >
        {busy ? '…' : (settings.unknownEmail?.continueLabel ?? 'Doorgaan')}
      </button>

      <Link
        href="/winkelwagen"
        className="block font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
      >
        Terug naar winkelwagen
      </Link>
    </form>
  )
}
