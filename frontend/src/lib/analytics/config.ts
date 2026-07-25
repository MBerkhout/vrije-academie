/** Analytics feature flags and container IDs. */

export function isAnalyticsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_GTM_ENABLED === 'false') return false
  return Boolean(process.env.NEXT_PUBLIC_GTM_ID?.trim())
}

export function getGtmId(): string | null {
  const id = process.env.NEXT_PUBLIC_GTM_ID?.trim()
  return id || null
}

export function getCookieBotId(): string | null {
  const id = process.env.NEXT_PUBLIC_COOKIE_BOT_ID?.trim()
  return id || null
}
