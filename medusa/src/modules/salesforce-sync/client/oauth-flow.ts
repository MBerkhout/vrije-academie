import * as crypto from "node:crypto"

import {
  newOAuthStateId,
  storeOAuthPendingState,
  takeOAuthPendingState,
} from "./oauth-pending-state"

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url")
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url")
}

/** Start OAuth: state + PKCE verifier stored in Redis (or memory in dev); returns authorize URL. */
export async function createOAuthAuthorization(): Promise<{
  state: string
  authorizeUrl: string
}> {
  const state = newOAuthStateId()
  const codeVerifier = generateCodeVerifier()
  await storeOAuthPendingState(state, codeVerifier)
  const authorizeUrl = buildSalesforceAuthorizeUrl(state, generateCodeChallenge(codeVerifier))
  return { state, authorizeUrl }
}

/** Validates state and returns PKCE verifier for token exchange (one-time use). */
export async function consumeOAuthState(
  state: string
): Promise<{ codeVerifier: string } | null> {
  return takeOAuthPendingState(state)
}

/**
 * OAuth redirect_uri sent to Salesforce (authorize + token exchange).
 * Override when a dev proxy sits in front of Medusa (must match Connected App exactly).
 */
export function salesforceOAuthCallbackUrl(): string {
  const explicit = process.env.SALESFORCE_OAUTH_CALLBACK_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const base = process.env.MEDUSA_URL?.trim().replace(/\/$/, "")
  if (!base) {
    throw new Error(
      "Set SALESFORCE_OAUTH_CALLBACK_URL or MEDUSA_URL for Salesforce OAuth callback"
    )
  }
  return `${base}/hooks/salesforce/oauth/callback`
}

/**
 * Where the browser lands after a successful OAuth callback (Admin Salesforce sync page).
 * Override when Admin is opened via a different host than MEDUSA_URL (e.g. proxy).
 */
export function salesforceAdminReturnUrl(query = ""): string {
  const explicit = process.env.SALESFORCE_OAUTH_RETURN_URL?.trim().replace(/\/$/, "")
  if (explicit) {
    return query ? `${explicit}?${query}` : explicit
  }

  const base = process.env.MEDUSA_URL?.trim().replace(/\/$/, "")
  if (!base) {
    throw new Error(
      "Set SALESFORCE_OAUTH_RETURN_URL or MEDUSA_URL for post-OAuth admin redirect"
    )
  }
  const adminPath = process.env.MEDUSA_ADMIN_PATH?.trim() || "/app"
  const path = adminPath.startsWith("/") ? adminPath : `/${adminPath}`
  return `${base}${path}/salesforce-sync${query ? `?${query}` : ""}`
}

const DEFAULT_SCOPES = "api refresh_token offline_access"

export function buildSalesforceAuthorizeUrl(state: string, codeChallenge: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID?.trim()
  if (!clientId) throw new Error("SALESFORCE_CLIENT_ID is not set")

  const loginUrl = (process.env.SALESFORCE_LOGIN_URL?.trim() || "https://login.salesforce.com").replace(
    /\/$/,
    ""
  )
  const redirectUri = salesforceOAuthCallbackUrl()
  const scope = process.env.SALESFORCE_OAUTH_SCOPES?.trim() || DEFAULT_SCOPES

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  return `${loginUrl}/services/oauth2/authorize?${params.toString()}`
}

export type TokenExchangeResult = {
  access_token: string
  refresh_token?: string
  instance_url?: string
  id?: string
}

export async function exchangeSalesforceAuthorizationCode(
  code: string,
  codeVerifier: string
): Promise<TokenExchangeResult> {
  const clientId = process.env.SALESFORCE_CLIENT_ID?.trim()
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error("SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required")
  }

  const loginUrl = (process.env.SALESFORCE_LOGIN_URL?.trim() || "https://login.salesforce.com").replace(
    /\/$/,
    ""
  )
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: salesforceOAuthCallbackUrl(),
    code,
    code_verifier: codeVerifier,
  })

  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      (json.error_description as string) || (json.error as string) || res.statusText
    throw new Error(msg)
  }

  return {
    access_token: json.access_token as string,
    refresh_token: json.refresh_token as string | undefined,
    instance_url: json.instance_url as string | undefined,
    id: json.id as string | undefined,
  }
}

export function maskClientId(clientId: string): string {
  if (clientId.length <= 8) return "••••"
  return `${clientId.slice(0, 4)}…${clientId.slice(-4)}`
}
