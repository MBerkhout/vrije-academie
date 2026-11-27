export type Ga4Config = {
  propertyId: string
  credentials?: { client_email: string; private_key: string }
}

/** Returns null when GA4 sync is disabled or not fully configured. */
export function getGa4Config(env: NodeJS.ProcessEnv = process.env): Ga4Config | null {
  if (env.GA4_ENABLED !== "true") return null
  const propertyId = env.GA4_PROPERTY_ID?.trim()
  if (!propertyId) return null
  const raw = env.GA4_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS (application default credentials).
    return env.GOOGLE_APPLICATION_CREDENTIALS ? { propertyId } : null
  }
  try {
    const parsed = JSON.parse(raw)
    return {
      propertyId,
      credentials: {
        client_email: parsed.client_email,
        private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
      },
    }
  } catch {
    return null
  }
}

export function getLookbackDays(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.GA4_SYNC_LOOKBACK_DAYS)
  return Number.isInteger(n) && n >= 1 && n <= 30 ? n : 3
}

/** Last `days` full days (yesterday first), as YYYY-MM-DD. */
export function lastDates(days: number, now = new Date()): string[] {
  const out: string[] = []
  for (let i = 1; i <= days; i++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}
