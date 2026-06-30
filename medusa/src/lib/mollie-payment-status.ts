/** Mollie payment statuses that mean checkout cannot complete. */
const MOLLIE_FAILED_STATUSES = new Set(["canceled", "cancelled", "expired", "failed"])

export function extractMolliePaymentId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (typeof d.id === "string" && d.id.startsWith("tr_")) return d.id
  if (typeof d.payment_id === "string" && d.payment_id.startsWith("tr_")) {
    return d.payment_id
  }
  return null
}

export function isMolliePaymentFailed(status: string | null | undefined): boolean {
  if (!status) return false
  return MOLLIE_FAILED_STATUSES.has(status.toLowerCase())
}

/** Fetch live payment status from Mollie (session.data is often stale after browser redirect). */
export async function fetchMolliePaymentStatus(
  paymentId: string
): Promise<string | null> {
  const apiKey = process.env.MOLLIE_API_KEY?.trim()
  if (!apiKey) return null

  try {
    const res = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { status?: string }
    return body.status?.toLowerCase() ?? null
  } catch {
    return null
  }
}
