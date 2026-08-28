import { isEuCountry, normalizeCountryCode } from '@/lib/address/eu-countries'

export type StrictPostalCountry = 'NL' | 'BE' | 'DE' | 'FR'

export function isNlCountry(countryCode: string): boolean {
  return normalizeCountryCode(countryCode) === 'NL'
}

function strictPostalCountry(countryCode: string): StrictPostalCountry | null {
  const code = normalizeCountryCode(countryCode)
  if (code === 'NL' || code === 'BE' || code === 'DE' || code === 'FR') return code
  return null
}

export function validatePostalCode(value: string, countryCode: string): boolean {
  const v = value.trim()
  const strict = strictPostalCountry(countryCode)
  switch (strict) {
    case 'NL':
      return /^[0-9]{4}\s?[a-zA-Z]{2}$/.test(v)
    case 'BE':
      return /^[1-9][0-9]{3}$/.test(v.replace(/\s/g, ''))
    case 'DE':
    case 'FR':
      return /^[0-9]{5}$/.test(v.replace(/\s/g, ''))
    default:
      if (!isEuCountry(countryCode)) return /^[0-9]{4}\s?[a-zA-Z]{2}$/.test(v)
      return v.length >= 2 && v.length <= 16
  }
}

export function postalCodePlaceholder(countryCode: string): string {
  switch (strictPostalCountry(countryCode)) {
    case 'NL':
      return '1234 AB'
    case 'BE':
      return '1000'
    case 'DE':
    case 'FR':
      return '12345'
    default:
      return 'Postcode'
  }
}

export function postalCodeHint(countryCode: string): string {
  switch (strictPostalCountry(countryCode)) {
    case 'NL':
      return 'Nederlandse postcode: 4 cijfers + 2 letters (bijv. 1234 AB).'
    case 'BE':
      return 'Belgische postcode: 4 cijfers (bijv. 1000).'
    case 'DE':
      return ''
    case 'FR':
      return 'Franse postcode: 5 cijfers.'
    default:
      return isEuCountry(countryCode) ? '' : 'Nederlandse postcode: 4 cijfers + 2 letters (bijv. 1234 AB).'
  }
}

export function postalCodeInvalidMessage(countryCode: string): string {
  switch (strictPostalCountry(countryCode)) {
    case 'BE':
      return 'Voer een geldige Belgische postcode in (4 cijfers, bijv. 1000).'
    case 'DE':
      return 'Voer een geldige Duitse postcode in (5 cijfers).'
    case 'FR':
      return 'Voer een geldige Franse postcode in (5 cijfers).'
    case 'NL':
      return 'Voer een geldige Nederlandse postcode in (1234 AB).'
    default:
      return isEuCountry(countryCode)
        ? 'Voer een geldige postcode in.'
        : 'Voer een geldige Nederlandse postcode in (1234 AB).'
  }
}
