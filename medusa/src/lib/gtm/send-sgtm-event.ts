import { isSgtmEnabled, sgtmEndpointUrl } from "./sgtm-config"
import { toStapeDataClientBody } from "./sgtm-envelope"
import type { GtmPurchasePayload } from "./build-purchase-payload"

const DEFAULT_TIMEOUT_MS = 8000

export type SgtmEventPayload = Record<string, unknown> & { event: string }

function buildRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  const secret = process.env.SGTM_PURCHASE_SECRET?.trim()
  const apiKeyHeader = process.env.SGTM_API_KEY_HEADER?.trim()

  if (apiKeyHeader && secret) {
    headers[apiKeyHeader] = secret
  } else if (secret) {
    headers.Authorization = `Bearer ${secret}`
  }

  if (process.env.SGTM_DEBUG === "true") {
    headers["X-Gtm-Server-Preview"] = process.env.SGTM_PREVIEW_HEADER?.trim() || "1"
  }

  return headers
}

export async function sendSgtmEvent(payload: SgtmEventPayload): Promise<void> {
  if (!isSgtmEnabled()) {
    throw new Error("sGTM is not enabled")
  }

  const endpoint = sgtmEndpointUrl()
  const body = toStapeDataClientBody(payload)
  const headers = buildRequestHeaders()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`sGTM responded ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function sendSgtmEventWithRetry(
  payload: SgtmEventPayload,
  retries = 1
): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await sendSgtmEvent(payload)
      return
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

export async function sendSgtmPurchaseEvent(payload: GtmPurchasePayload): Promise<void> {
  return sendSgtmEvent(payload)
}

export async function sendSgtmPurchaseEventWithRetry(
  payload: GtmPurchasePayload,
  retries = 1
): Promise<void> {
  return sendSgtmEventWithRetry(payload, retries)
}
