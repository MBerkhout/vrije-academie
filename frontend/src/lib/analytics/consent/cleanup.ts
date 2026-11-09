import { TRACKING_COOKIES_PREFIXES } from '@/lib/analytics/consent/constants'

/** Remove known marketing/analytics cookies on reject (legacy banner behaviour + Meta). */
export function deleteTrackingCookies(): void {
  if (typeof document === 'undefined') return

  const hostname = window.location.hostname
  const domains = [hostname, hostname.startsWith('www.') ? hostname.slice(4) : `www.${hostname}`]

  const raw = document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter(Boolean)

  for (const name of raw) {
    const shouldDelete =
      name.startsWith('_ga_') ||
      TRACKING_COOKIES_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}_`))
    if (!shouldDelete) continue

    for (const domain of domains) {
      document.cookie = `${name}=;path=/;max-age=0`
      document.cookie = `${name}=;path=/;domain=${domain};max-age=0`
    }
  }
}
