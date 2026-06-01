import jwt from "jsonwebtoken"

import { salesforceAuthMode, hasSalesforceJwtCredentials } from "./auth-mode"
import { logSalesforceTokenRequest, logSalesforceTokenResponse } from "./http-debug"
import { resolveRefreshTokenForAuth, resolveStoredOAuthCredentials } from "./oauth-credentials"

export type TokenCache = {
  access_token: string
  instance_url: string
  expires_at_ms: number
}

let cache: TokenCache | null = null

function getEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`${name} must be set for Salesforce auth`)
  return v
}

function loginUrl(): string {
  return process.env.SALESFORCE_LOGIN_URL?.trim() || "https://login.salesforce.com"
}

function tokenUrl(): string {
  return `${loginUrl().replace(/\/$/, "")}/services/oauth2/token`
}

function cacheToken(json: Record<string, unknown>, now: number): TokenCache {
  const access_token = json.access_token as string
  let instance_url = (json.instance_url as string | undefined)?.trim() || ""
  if (!instance_url) {
    instance_url = process.env.SALESFORCE_INSTANCE_URL?.trim() || ""
  }
  if (!access_token) throw new Error("Salesforce token response missing access_token")
  if (!instance_url) {
    throw new Error(
      "Salesforce token response missing instance_url — set SALESFORCE_INSTANCE_URL or reconnect in Admin"
    )
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600
  cache = {
    access_token,
    instance_url: instance_url.replace(/\/$/, ""),
    expires_at_ms: now + expiresIn * 1000,
  }
  return cache
}

async function exchangeToken(body: URLSearchParams, grantLabel: string): Promise<TokenCache> {
  logSalesforceTokenRequest(grantLabel)
  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    logSalesforceTokenResponse(res.status, false, {
      error: json.error as string | undefined,
      description: json.error_description as string | undefined,
    })
    const msg =
      (json.error_description as string) || (json.error as string) || res.statusText
    throw new Error(`Salesforce token exchange failed (${grantLabel}): ${msg}`)
  }

  logSalesforceTokenResponse(res.status, true)
  return cacheToken(json, Date.now())
}

/** JWT bearer (Connected App + certificate / private key + integration user). */
async function getTokenJwt(): Promise<TokenCache> {
  const clientId = getEnv("SALESFORCE_CLIENT_ID")
  const username = getEnv("SALESFORCE_USERNAME")
  let privateKey = getEnv("SALESFORCE_PRIVATE_KEY")
  privateKey = privateKey.replace(/\\n/g, "\n")

  const assertion = jwt.sign(
    { iss: clientId, sub: username, aud: loginUrl() },
    privateKey,
    { algorithm: "RS256", expiresIn: 180 }
  )

  return exchangeToken(
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    "jwt-bearer"
  )
}

/**
 * Refresh token (Connected App consumer key + consumer secret).
 * Obtain `SALESFORCE_REFRESH_TOKEN` once via Authorization Code flow (see docs).
 */
async function getTokenRefresh(): Promise<TokenCache> {
  const refresh_token = await resolveRefreshTokenForAuth()
  const stored = await resolveStoredOAuthCredentials()
  const result = await exchangeToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getEnv("SALESFORCE_CLIENT_ID"),
      client_secret: getEnv("SALESFORCE_CLIENT_SECRET"),
      refresh_token,
    }),
    "refresh_token"
  )
  if (!process.env.SALESFORCE_INSTANCE_URL?.trim() && stored.instance_url) {
    const url = stored.instance_url.replace(/\/$/, "")
    cache = { ...result, instance_url: url }
    return cache
  }
  return result
}

/**
 * Resolve access token (cached until ~1 min before expiry).
 */
export async function getSalesforceAccessToken(): Promise<TokenCache> {
  const now = Date.now()
  if (cache && cache.expires_at_ms > now + 60_000) {
    return cache
  }

  const mode = salesforceAuthMode()
  if (mode === "jwt") return getTokenJwt()
  if (mode === "refresh_token") return getTokenRefresh()
  if (
    process.env.SALESFORCE_CLIENT_ID?.trim() &&
    process.env.SALESFORCE_CLIENT_SECRET?.trim() &&
    !hasSalesforceJwtCredentials()
  ) {
    return getTokenRefresh()
  }

  throw new Error(
    "Salesforce auth not configured: set JWT (CLIENT_ID + PRIVATE_KEY + USERNAME) or refresh (CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN)"
  )
}

export function clearSalesforceTokenCache(): void {
  cache = null
}
