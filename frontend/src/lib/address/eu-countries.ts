/** EU member states with standard B2C VAT rates (2026). */
export type EuCountry = {
  /** ISO 3166-1 alpha-2 (uppercase in UI). */
  code: string
  labelNl: string
  vatRate: number
}

export const EU_COUNTRIES: EuCountry[] = [
  { code: 'AT', labelNl: 'Oostenrijk', vatRate: 20 },
  { code: 'BE', labelNl: 'België', vatRate: 21 },
  { code: 'BG', labelNl: 'Bulgarije', vatRate: 20 },
  { code: 'CY', labelNl: 'Cyprus', vatRate: 19 },
  { code: 'CZ', labelNl: 'Tsjechië', vatRate: 21 },
  { code: 'DE', labelNl: 'Duitsland', vatRate: 19 },
  { code: 'DK', labelNl: 'Denemarken', vatRate: 25 },
  { code: 'EE', labelNl: 'Estland', vatRate: 24 },
  { code: 'ES', labelNl: 'Spanje', vatRate: 21 },
  { code: 'FI', labelNl: 'Finland', vatRate: 25.5 },
  { code: 'FR', labelNl: 'Frankrijk', vatRate: 20 },
  { code: 'GR', labelNl: 'Griekenland', vatRate: 24 },
  { code: 'HR', labelNl: 'Kroatië', vatRate: 25 },
  { code: 'HU', labelNl: 'Hongarije', vatRate: 27 },
  { code: 'IE', labelNl: 'Ierland', vatRate: 23 },
  { code: 'IT', labelNl: 'Italië', vatRate: 22 },
  { code: 'LT', labelNl: 'Litouwen', vatRate: 21 },
  { code: 'LU', labelNl: 'Luxemburg', vatRate: 17 },
  { code: 'LV', labelNl: 'Letland', vatRate: 21 },
  { code: 'MT', labelNl: 'Malta', vatRate: 18 },
  { code: 'NL', labelNl: 'Nederland', vatRate: 21 },
  { code: 'PL', labelNl: 'Polen', vatRate: 23 },
  { code: 'PT', labelNl: 'Portugal', vatRate: 23 },
  { code: 'RO', labelNl: 'Roemenië', vatRate: 21 },
  { code: 'SE', labelNl: 'Zweden', vatRate: 25 },
  { code: 'SI', labelNl: 'Slovenië', vatRate: 22 },
  { code: 'SK', labelNl: 'Slowakije', vatRate: 23 },
]

export const PINNED_EU_COUNTRY_CODES = ['NL', 'BE', 'DE'] as const

const byCode = new Map(EU_COUNTRIES.map((c) => [c.code, c]))

export function normalizeCountryCode(code: string): string {
  return code.trim().toUpperCase()
}

export function isEuCountry(code: string): boolean {
  return byCode.has(normalizeCountryCode(code))
}

export function getEuCountry(code: string | null | undefined): EuCountry | undefined {
  if (!code?.trim()) return undefined
  return byCode.get(normalizeCountryCode(code))
}

export function getEuCountryLabel(code: string | null | undefined): string {
  return getEuCountry(code)?.labelNl ?? normalizeCountryCode(code ?? '')
}

export function getEuVatRate(code: string | null | undefined): number {
  return getEuCountry(code)?.vatRate ?? 21
}

function matchesSearch(country: EuCountry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    country.labelNl.toLowerCase().includes(q) ||
    country.code.toLowerCase().includes(q)
  )
}

/** Pinned NL/BE/DE plus full EU list in Dutch A–Z (with NL/BE/DE at their natural positions). */
export function buildEuCountryPickerSections(searchQuery = ''): {
  pinned: EuCountry[]
  all: EuCountry[]
} {
  const sorted = [...EU_COUNTRIES].sort((a, b) =>
    a.labelNl.localeCompare(b.labelNl, 'nl', { sensitivity: 'base' })
  )
  const pinned = PINNED_EU_COUNTRY_CODES.map((code) => byCode.get(code)!)
  const pinnedFiltered = pinned.filter((c) => matchesSearch(c, searchQuery))

  return {
    pinned: pinnedFiltered,
    all: sorted.filter((c) => matchesSearch(c, searchQuery)),
  }
}

export function formatVatRatePercent(rate: number): string {
  if (Number.isInteger(rate)) return String(rate)
  return rate.toString().replace('.', ',')
}
