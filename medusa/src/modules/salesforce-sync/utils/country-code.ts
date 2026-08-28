import { EU_COUNTRIES } from "../../../lib/eu-countries"

/** Map Medusa ISO-3166 alpha-2 codes to Salesforce country labels (NL org). */
const ISO_TO_SF: Record<string, string> = Object.fromEntries(
  EU_COUNTRIES.map((c) => [c.code, c.labelEn])
)

// Legacy / non-EU codes used before full EU rollout
Object.assign(ISO_TO_SF, {
  gb: "United Kingdom",
  uk: "United Kingdom",
  us: "United States",
})

const SF_TO_ISO: Record<string, string> = Object.fromEntries([
  ...EU_COUNTRIES.flatMap((c) => [
    [c.labelEn.toLowerCase(), c.code],
    [c.labelNl.toLowerCase(), c.code],
  ]),
  ["netherlands", "nl"],
  ["nederland", "nl"],
  ["belgium", "be"],
  ["belgië", "be"],
  ["belgie", "be"],
  ["germany", "de"],
  ["duitsland", "de"],
  ["france", "fr"],
  ["frankrijk", "fr"],
  ["united kingdom", "gb"],
  ["uk", "gb"],
  ["united states", "us"],
  ["usa", "us"],
  ["luxembourg", "lu"],
  ["luxemburg", "lu"],
])

export function medusaCountryToSalesforce(countryCode: string | null | undefined): string | undefined {
  if (!countryCode?.trim()) return undefined
  const key = countryCode.trim().toLowerCase()
  return ISO_TO_SF[key] ?? countryCode.trim().toUpperCase()
}

export function salesforceCountryToMedusa(country: string | null | undefined): string | undefined {
  if (!country?.trim()) return undefined
  const normalized = country.trim().toLowerCase()
  if (normalized.length === 2) return normalized
  return SF_TO_ISO[normalized] ?? undefined
}
