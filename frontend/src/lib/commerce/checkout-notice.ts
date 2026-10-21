/**
 * One-shot checkout messages (email/account conflicts). Survives redirects via sessionStorage.
 */

const STORAGE_KEY = 'va_checkout_notice'

export type CheckoutNoticeKind = 'email_mismatch' | 'cart_account_conflict' | 'generic'

export type CheckoutNotice = {
  kind: CheckoutNoticeKind
  message: string
}

export function buildEmailMismatchNotice(loggedInEmail: string, cartEmail: string): CheckoutNotice {
  return {
    kind: 'email_mismatch',
    message: `Je bent ingelogd als ${loggedInEmail}, maar voor deze bestelling staat ${cartEmail}. Log in met ${cartEmail} om je aankoop op het juiste account te zetten (o.a. VAthuis-collectie). Of pas het e-mailadres aan naar ${loggedInEmail} als je met dit account wilt betalen.`,
  }
}

export function mapCartSyncErrorMessage(raw: string | undefined): string {
  const msg = raw?.trim() ?? ''
  if (/another customer/i.test(msg) || /ander account/i.test(msg)) {
    return 'Dit winkelmandje hoort bij een ander account. Log uit en log in met het e-mailadres dat je bij afrekenen gebruikt, of maak je bestelling af na opnieuw inloggen.'
  }
  if (!msg || msg === 'CART_SYNC_FAILED') {
    return 'Kon je winkelmandje niet koppelen aan je account. Log opnieuw in met het e-mailadres van je bestelling.'
  }
  return msg
}

export function setCheckoutNotice(notice: CheckoutNotice): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notice))
  } catch {
    /* ignore */
  }
}

export function consumeCheckoutNotice(): CheckoutNotice | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)
    const parsed = JSON.parse(raw) as CheckoutNotice
    if (typeof parsed?.message !== 'string' || !parsed.message.trim()) return null
    return parsed
  } catch {
    return null
  }
}
