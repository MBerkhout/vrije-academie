/** Whether Cookiebot allows reading marketing / analytics cookies for attribution. */
export function hasAttributionConsent(): boolean {
  if (typeof window === 'undefined') return false
  const cb = window.Cookiebot?.consent
  if (!cb) return false
  return cb.marketing === true || cb.statistics === true
}
