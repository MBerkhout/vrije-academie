export type OrderAnalyticsAttribution = {
  event_id?: string
  client_id?: string
  session_id?: string
  fbp?: string
  fbc?: string
  gclid?: string
  ttclid?: string
  user_agent?: string
  page_location?: string
  payment_type?: string
  captured_at?: string
}

function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const raw = obj[key]
  if (typeof raw !== "string") return undefined
  const trimmed = raw.trim()
  return trimmed || undefined
}

export function parseOrderAnalyticsMetadata(
  metadata: Record<string, unknown> | null | undefined
): OrderAnalyticsAttribution {
  if (!metadata || typeof metadata !== "object") return {}
  const analytics = metadata.analytics
  if (!analytics || typeof analytics !== "object") return {}
  const a = analytics as Record<string, unknown>

  return {
    event_id: pickString(a, "event_id"),
    client_id: pickString(a, "client_id"),
    session_id: pickString(a, "session_id"),
    fbp: pickString(a, "fbp"),
    fbc: pickString(a, "fbc"),
    gclid: pickString(a, "gclid"),
    ttclid: pickString(a, "ttclid"),
    user_agent: pickString(a, "user_agent"),
    page_location: pickString(a, "page_location"),
    payment_type: pickString(a, "payment_type"),
    captured_at: pickString(a, "captured_at"),
  }
}
