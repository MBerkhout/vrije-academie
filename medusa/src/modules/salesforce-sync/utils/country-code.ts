/** Map Medusa ISO-3166 alpha-2 codes to Salesforce country labels (NL org). */
const ISO_TO_SF: Record<string, string> = {
  nl: "Netherlands",
  be: "Belgium",
  de: "Germany",
  fr: "France",
  gb: "United Kingdom",
  uk: "United Kingdom",
  us: "United States",
  lu: "Luxembourg",
}

const SF_TO_ISO: Record<string, string> = {
  netherlands: "nl",
  nederland: "nl",
  belgium: "be",
  belgië: "be",
  belgie: "be",
  germany: "de",
  duitsland: "de",
  france: "fr",
  frankrijk: "fr",
  "united kingdom": "gb",
  uk: "gb",
  "united states": "us",
  usa: "us",
  luxembourg: "lu",
}

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
