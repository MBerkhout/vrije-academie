import jwt from "jsonwebtoken"

import { salesforceAuthMode, hasSalesforceJwtCredentials } from "./auth-mode"
import { logSalesforceTokenRequest, logSalesforceTokenResponse } from "./http-debug"
import {
  persistRotatedRefreshToken,
  resolveRefreshTokenForAuth,
} from "./oauth-credentials"
import { withSalesforceRefreshLock } from "./refresh-lock"
import {
  deleteSharedAccessToken,
  isTokenFresh,
  readSharedAccessToken,
  type TokenCache,
  writeSharedAccessToken,
} from "./token-store"

export type { TokenCache }

let cache: TokenCache | null = null
let refreshInFlight: Promise<TokenCache> | null = null

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
  const rotated =
    typeof json.refresh_token === "string" ? json.refresh_token.trim() : ""
  if (grantLabel === "refresh_token" && rotated) {
    const persisted = await persistRotatedRefreshToken(rotated)
    if (!persisted) {
      console.warn(
        "[salesforce] Received a rotated refresh token but could not persist it — reconnect in Admin or set SALESFORCE_REFRESH_TOKEN"
      )
    }
  }
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
async function exchangeRefreshToken(refreshToken: string): Promise<TokenCache> {
  return exchangeToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getEnv("SALESFORCE_CLIENT_ID"),
      client_secret: getEnv("SALESFORCE_CLIENT_SECRET"),
      refresh_token: refreshToken,
    }),
    "refresh_token"
  )
}

/** Adopt the access token another process already obtained, if still valid. */
async function adoptSharedToken(): Promise<TokenCache | null> {
  const shared = await readSharedAccessToken()
  if (shared) cache = shared
  return shared
}

/**
 * Every refresh rotates the refresh token (Salesforce enforces rotation), so refresh as
 * rarely as possible: reuse this process's token, then the one shared via Redis, and only
 * then refresh under the cross-process lock.
 */
async function getTokenRefresh(): Promise<TokenCache> {
  if (isTokenFresh(cache)) return cache
  const shared = await adoptSharedToken()
  if (shared) return shared
  if (!refreshInFlight) {
    refreshInFlight = withSalesforceRefreshLock(async () => {
      if (isTokenFresh(cache)) return cache
      const sharedInLock = await adoptSharedToken()
      if (sharedInLock) return sharedInLock
      const refreshToken = await resolveRefreshTokenForAuth()
      let token: TokenCache
      try {
        token = await exchangeRefreshToken(refreshToken)
      } catch (err) {
        const latest = await resolveRefreshTokenForAuth().catch(() => refreshToken)
        const message = err instanceof Error ? err.message : String(err)
        if (latest === refreshToken || !message.includes("expired access/refresh token")) throw err
        token = await exchangeRefreshToken(latest)
      }
      await writeSharedAccessToken(token)
      return token
    }).finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/**
 * Resolve access token (cached until ~1 min before expiry).
 */
export async function getSalesforceAccessToken(): Promise<TokenCache> {
  if (isTokenFresh(cache)) return cache

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

/**
 * Forget the access token in this process and in Redis. Pass the rejected token (on 401)
 * to keep a newer shared token another process already refreshed.
 */
export async function invalidateSalesforceAccessToken(rejectedAccessToken?: string): Promise<void> {
  if (!rejectedAccessToken || cache?.access_token === rejectedAccessToken) cache = null
  await deleteSharedAccessToken(rejectedAccessToken)
}
