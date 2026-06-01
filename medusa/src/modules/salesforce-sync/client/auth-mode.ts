import { hasDbRefreshTokenCached } from "./oauth-credentials"

export type SalesforceAuthMode = "jwt" | "refresh_token"

export function hasSalesforceJwtCredentials(): boolean {
  return !!(
    process.env.SALESFORCE_CLIENT_ID?.trim() &&
    process.env.SALESFORCE_PRIVATE_KEY?.trim() &&
    process.env.SALESFORCE_USERNAME?.trim()
  )
}

export function hasSalesforceRefreshEnvCredentials(): boolean {
  return !!(
    process.env.SALESFORCE_CLIENT_ID?.trim() &&
    process.env.SALESFORCE_CLIENT_SECRET?.trim() &&
    process.env.SALESFORCE_REFRESH_TOKEN?.trim()
  )
}

export function canStartSalesforceOAuthConnect(): boolean {
  return !!(
    process.env.SALESFORCE_CLIENT_ID?.trim() &&
    process.env.SALESFORCE_CLIENT_SECRET?.trim() &&
    !hasSalesforceJwtCredentials()
  )
}

/** Which OAuth flow to use for server-to-server API access. */
export function salesforceAuthMode(): SalesforceAuthMode | null {
  const explicit = process.env.SALESFORCE_AUTH_MODE?.trim().toLowerCase()
  if (explicit === "jwt" || explicit === "refresh_token") {
    return explicit
  }

  if (hasSalesforceJwtCredentials()) return "jwt"
  if (hasSalesforceRefreshEnvCredentials()) return "refresh_token"
  if (
    hasDbRefreshTokenCached() &&
    process.env.SALESFORCE_CLIENT_ID?.trim() &&
    process.env.SALESFORCE_CLIENT_SECRET?.trim()
  ) {
    return "refresh_token"
  }
  return null
}

export function isSalesforceConfigured(): boolean {
  return salesforceAuthMode() !== null
}
