import jwt from "jsonwebtoken"

export const IMPERSONATION_JWT_EXPIRES_IN = "1h"
export const IMPERSONATION_JWT_CLAIM = "impersonated_by"

export type CustomerJwtPayload = {
  actor_id?: string
  actor_type?: string
  app_metadata?: {
    customer_id?: string
    impersonated_by?: string
  }
}

export function bearerTokenFromAuthorization(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}

export function decodeCustomerJwtPayload(
  token: string,
  secret: string
): CustomerJwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as CustomerJwtPayload
    return decoded
  } catch {
    return null
  }
}

export function jwtHasImpersonationClaim(payload: CustomerJwtPayload | null): boolean {
  const by = payload?.app_metadata?.impersonated_by
  return typeof by === "string" && by.length > 0
}

export function impersonatedByAdminId(payload: CustomerJwtPayload | null): string | null {
  const by = payload?.app_metadata?.impersonated_by
  return typeof by === "string" && by.length > 0 ? by : null
}

/** Decode JWT payload without verification (storefront banner only). */
export function decodeJwtPayloadUnsafe(token: string): CustomerJwtPayload | null {
  try {
    const part = token.split(".")[1]
    if (!part) return null
    const json = Buffer.from(part, "base64url").toString("utf8")
    return JSON.parse(json) as CustomerJwtPayload
  } catch {
    return null
  }
}