/** EU member states with standard B2C VAT rates (2026). */
export type EuCountry = {
  /** ISO 3166-1 alpha-2, lowercase in Medusa; uppercase in UI. */
  code: string
  /** Dutch label for storefront / admin. */
  labelNl: string
  /** English label for Salesforce picklists. */
  labelEn: string
  /** Standard VAT percentage (e.g. 21 = 21%). */
  vatRate: number
}

/** All 27 EU member states. */
export const EU_COUNTRIES: EuCountry[] = [
  { code: "at", labelNl: "Oostenrijk", labelEn: "Austria", vatRate: 20 },
  { code: "be", labelNl: "België", labelEn: "Belgium", vatRate: 21 },
  { code: "bg", labelNl: "Bulgarije", labelEn: "Bulgaria", vatRate: 20 },
  { code: "cy", labelNl: "Cyprus", labelEn: "Cyprus", vatRate: 19 },
  { code: "cz", labelNl: "Tsjechië", labelEn: "Czech Republic", vatRate: 21 },
  { code: "de", labelNl: "Duitsland", labelEn: "Germany", vatRate: 19 },
  { code: "dk", labelNl: "Denemarken", labelEn: "Denmark", vatRate: 25 },
  { code: "ee", labelNl: "Estland", labelEn: "Estonia", vatRate: 24 },
  { code: "es", labelNl: "Spanje", labelEn: "Spain", vatRate: 21 },
  { code: "fi", labelNl: "Finland", labelEn: "Finland", vatRate: 25.5 },
  { code: "fr", labelNl: "Frankrijk", labelEn: "France", vatRate: 20 },
  { code: "gr", labelNl: "Griekenland", labelEn: "Greece", vatRate: 24 },
  { code: "hr", labelNl: "Kroatië", labelEn: "Croatia", vatRate: 25 },
  { code: "hu", labelNl: "Hongarije", labelEn: "Hungary", vatRate: 27 },
  { code: "ie", labelNl: "Ierland", labelEn: "Ireland", vatRate: 23 },
  { code: "it", labelNl: "Italië", labelEn: "Italy", vatRate: 22 },
  { code: "lt", labelNl: "Litouwen", labelEn: "Lithuania", vatRate: 21 },
  { code: "lu", labelNl: "Luxemburg", labelEn: "Luxembourg", vatRate: 17 },
  { code: "lv", labelNl: "Letland", labelEn: "Latvia", vatRate: 21 },
  { code: "mt", labelNl: "Malta", labelEn: "Malta", vatRate: 18 },
  { code: "nl", labelNl: "Nederland", labelEn: "Netherlands", vatRate: 21 },
  { code: "pl", labelNl: "Polen", labelEn: "Poland", vatRate: 23 },
  { code: "pt", labelNl: "Portugal", labelEn: "Portugal", vatRate: 23 },
  { code: "ro", labelNl: "Roemenië", labelEn: "Romania", vatRate: 21 },
  { code: "se", labelNl: "Zweden", labelEn: "Sweden", vatRate: 25 },
  { code: "si", labelNl: "Slovenië", labelEn: "Slovenia", vatRate: 22 },
  { code: "sk", labelNl: "Slowakije", labelEn: "Slovakia", vatRate: 23 },
]

export const EU_COUNTRY_CODES = EU_COUNTRIES.map((c) => c.code)

const byCode = new Map(EU_COUNTRIES.map((c) => [c.code, c]))

export function getEuCountry(code: string | null | undefined): EuCountry | undefined {
  if (!code?.trim()) return undefined
  return byCode.get(code.trim().toLowerCase())
}

export function getEuVatRate(code: string | null | undefined): number {
  return getEuCountry(code)?.vatRate ?? 21
}
