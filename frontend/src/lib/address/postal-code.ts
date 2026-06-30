export type SupportedCountry = 'NL' | 'BE' | 'DE' | 'FR'

export function normalizeCountryCode(code: string): SupportedCountry {
  const upper = code.trim().toUpperCase()
  if (upper === 'BE' || upper === 'DE' || upper === 'FR') return upper
  return 'NL'
}

export function isNlCountry(countryCode: string): boolean {
  return normalizeCountryCode(countryCode) === 'NL'
}

export function validatePostalCode(value: string, countryCode: string): boolean {
  const v = value.trim()
  switch (normalizeCountryCode(countryCode)) {
    case 'NL':
      return /^[0-9]{4}\s?[a-zA-Z]{2}$/.test(v)
    case 'BE':
      return /^[1-9][0-9]{3}$/.test(v.replace(/\s/g, ''))
    case 'DE':
    case 'FR':
      return /^[0-9]{5}$/.test(v.replace(/\s/g, ''))
  }
}

export function postalCodePlaceholder(countryCode: string): string {
  switch (normalizeCountryCode(countryCode)) {
    case 'NL':
      return '1234 AB'
    case 'BE':
      return '1000'
    case 'DE':
    case 'FR':
      return '12345'
  }
}

export function postalCodeHint(countryCode: string): string {
  switch (normalizeCountryCode(countryCode)) {
    case 'NL':
      return 'Nederlandse postcode: 4 cijfers + 2 letters (bijv. 1234 AB).'
    case 'BE':
      return 'Belgische postcode: 4 cijfers (bijv. 1000).'
    case 'DE':
      return ''
    case 'FR':
      return 'Franse postcode: 5 cijfers.'
  }
}

export function postalCodeInvalidMessage(countryCode: string): string {
  switch (normalizeCountryCode(countryCode)) {
    case 'BE':
      return 'Voer een geldige Belgische postcode in (4 cijfers, bijv. 1000).'
    case 'DE':
      return 'Voer een geldige Duitse postcode in (5 cijfers).'
    case 'FR':
      return 'Voer een geldige Franse postcode in (5 cijfers).'
    default:
      return 'Voer een geldige Nederlandse postcode in (1234 AB).'
  }
}
