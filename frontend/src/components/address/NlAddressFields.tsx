'use client'

import { ValidatedInput } from '@/components/auth/ValidatedInput'
import type { AccountFieldName, CheckoutGuestValidity } from '@/lib/auth/account-field-validation'
import { isNlCountry, postalCodeHint, postalCodePlaceholder } from '@/lib/address/postal-code'
import { cn } from '@/lib/utils'

export type NlAddressFieldLabels = {
  postalCode: string
  houseNumber: string
  street: string
  city: string
  country: string
}

type AddressLookup = 'idle' | 'loading' | 'found' | 'error'

export interface NlAddressFieldsProps {
  labels: NlAddressFieldLabels
  postalCode: string
  houseNumber: string
  street: string
  city: string
  country: string
  manualAddress: boolean
  addressLookup: AddressLookup
  busy: boolean
  validity: Pick<CheckoutGuestValidity, 'postalCode' | 'houseNumber' | 'street' | 'city'>
  onPostalCodeChange: (v: string) => void
  onHouseNumberChange: (v: string) => void
  onStreetChange: (v: string) => void
  onCityChange: (v: string) => void
  onCountryChange: (v: string) => void
  onManualAddress: (v: boolean) => void
  blur: (name: 'postalCode' | 'houseNumber' | 'street' | 'city', value: string) => void
  reset: (name: AccountFieldName) => void
  /** Optional section heading above the country field */
  sectionTitle?: string
  className?: string
}

/**
 * Land first, then Dutch postcode + huisnummer (PDOK), then manual straat/plaats when needed.
 * Shared by checkout guest step, registration, and account profile address.
 */
export function NlAddressFields({
  labels,
  postalCode,
  houseNumber,
  street,
  city,
  country,
  manualAddress,
  addressLookup,
  busy,
  validity,
  onPostalCodeChange,
  onHouseNumberChange,
  onStreetChange,
  onCityChange,
  onCountryChange,
  onManualAddress,
  blur,
  reset,
  sectionTitle,
  className,
}: NlAddressFieldsProps) {
  const nlAddress = isNlCountry(country)
  const hint = postalCodeHint(country)

  return (
    <div className={cn('space-y-2', className)}>
      {sectionTitle ? (
        <h2 className="font-sans text-base font-bold text-va-black mb-1">{sectionTitle}</h2>
      ) : null}
      <div>
        <label className="block font-sans text-sm font-medium text-va-black mb-1">
          {labels.country}
        </label>
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className="w-full rounded-lg border border-va-lightgray-300 px-3 py-2 font-sans text-sm focus:outline-none focus:border-va-black bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={busy}
        >
          <option value="NL">Nederland</option>
          <option value="BE">België</option>
          <option value="DE">Duitsland</option>
          <option value="FR">Frankrijk</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ValidatedInput
          name="postalCode"
          label={labels.postalCode}
          required
          autoComplete="postal-code"
          placeholder={postalCodePlaceholder(country)}
          value={postalCode}
          onChange={(v) => {
            onPostalCodeChange(v)
            if (nlAddress) onManualAddress(false)
            reset('postalCode')
          }}
          onBlur={() => blur('postalCode', postalCode)}
          validity={validity.postalCode}
          disabled={busy}
        />
        <ValidatedInput
          name="houseNumber"
          label={labels.houseNumber}
          required
          placeholder="10 A"
          value={houseNumber}
          onChange={(v) => {
            onHouseNumberChange(v)
            if (nlAddress) onManualAddress(false)
            reset('houseNumber')
          }}
          onBlur={() => blur('houseNumber', houseNumber)}
          validity={validity.houseNumber}
          disabled={busy}
        />
      </div>
      {hint ? <p className="font-sans text-xs text-va-gray">{hint}</p> : null}

      {nlAddress && !manualAddress && addressLookup === 'loading' && (
        <p className="font-sans text-xs text-va-gray">Adres opzoeken…</p>
      )}

      {nlAddress && !manualAddress && addressLookup === 'found' && (
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 bg-va-lightgray-100 border border-va-lightgray-300">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="text-green-600 shrink-0"
            aria-hidden
          >
            <path
              d="M2.5 7l3 3 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-sans text-sm text-va-black flex-1">
            {street} {houseNumber},{' '}
            {postalCode.replace(/\s/g, '').toUpperCase().replace(/^(\d{4})([a-zA-Z]{2})$/, '$1 $2')}{' '}
            {city}
          </span>
          <button
            type="button"
            onClick={() => onManualAddress(true)}
            className="font-sans text-xs text-va-gray hover:text-va-black underline underline-offset-2 transition-colors shrink-0"
          >
            Wijzigen
          </button>
        </div>
      )}

      {nlAddress && !manualAddress && addressLookup === 'error' && (
        <div className="space-y-1">
          <p className="font-sans text-xs text-va-gray">
            Adres niet gevonden voor deze postcode en huisnummer.
          </p>
          <button
            type="button"
            onClick={() => onManualAddress(true)}
            className="font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
          >
            Klik hier om handmatig in te vullen
          </button>
        </div>
      )}

      {manualAddress && (
        <div className="space-y-3 pt-1">
          <ValidatedInput
            name="street"
            label={labels.street}
            required
            autoComplete="address-line1"
            value={street}
            onChange={(v) => {
              onStreetChange(v)
              reset('street')
            }}
            onBlur={() => blur('street', street)}
            validity={validity.street}
            disabled={busy}
          />
          <ValidatedInput
            name="city"
            label={labels.city}
            required
            autoComplete="address-level2"
            value={city}
            onChange={(v) => {
              onCityChange(v)
              reset('city')
            }}
            onBlur={() => blur('city', city)}
            validity={validity.city}
            disabled={busy}
          />
        </div>
      )}
    </div>
  )
}
