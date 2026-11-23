import { safeSessionStorage } from '@/lib/safe-storage'
/** Session flag while an admin is viewing the storefront as a customer. */
export const IMPERSONATION_SESSION_KEY = 'va_impersonation_active'

export function markImpersonationSessionActive(): void {
  if (typeof window === 'undefined') return
  safeSessionStorage.setItem(IMPERSONATION_SESSION_KEY, '1')
}

export function clearImpersonationSession(): void {
  if (typeof window === 'undefined') return
  safeSessionStorage.removeItem(IMPERSONATION_SESSION_KEY)
}

export function isImpersonationSessionFlagSet(): boolean {
  if (typeof window === 'undefined') return false
  return safeSessionStorage.getItem(IMPERSONATION_SESSION_KEY) === '1'
}

type JwtPayload = {
  app_metadata?: { impersonated_by?: string }
}

export function jwtHasImpersonationClaim(token: string): boolean {
  try {
    const part = token.split('.')[1]
    if (!part) return false
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as JwtPayload
    const by = payload.app_metadata?.impersonated_by
    return typeof by === 'string' && by.length > 0
  } catch {
    return false
  }
}

export function isImpersonationSession(token: string | null): boolean {
  if (!token) return isImpersonationSessionFlagSet()
  return isImpersonationSessionFlagSet() || jwtHasImpersonationClaim(token)
}