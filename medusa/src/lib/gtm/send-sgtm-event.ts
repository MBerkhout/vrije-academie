import type { GtmPurchasePayload } from "./build-purchase-payload"

const DEFAULT_TIMEOUT_MS = 8000

export async function sendSgtmPurchaseEvent(payload: GtmPurchasePayload): Promise<void> {
  const endpoint = process.env.SGTM_ENDPOINT_URL?.trim()
  if (!endpoint) {
    throw new Error("SGTM_ENDPOINT_URL is not configured")
  }

  const secret = process.env.SGTM_PURCHASE_SECRET?.trim()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (secret) {
    headers.Authorization = `Bearer ${secret}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`sGTM responded ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function sendSgtmPurchaseEventWithRetry(
  payload: GtmPurchasePayload,
  retries = 1
): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await sendSgtmPurchaseEvent(payload)
      return
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}
