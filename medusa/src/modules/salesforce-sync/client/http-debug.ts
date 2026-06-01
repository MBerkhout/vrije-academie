/** Set `SALESFORCE_DEBUG_HTTP=1` to log outbound Salesforce REST and token calls (dev / support only). */

const PREFIX = "[salesforce-http]"

export function isSalesforceHttpDebug(): boolean {
  const v = process.env.SALESFORCE_DEBUG_HTTP?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

function maxBodyLen(): number {
  const n = Number(process.env.SALESFORCE_DEBUG_HTTP_BODY_MAX)
  if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), 200_000)
  return 4_000
}

function trunc(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}… (+${s.length - max} more chars)`
}

export function logSalesforceHttpRequest(method: string, apiPath: string, body?: unknown): void {
  if (!isSalesforceHttpDebug()) return
  const b =
    body === undefined ? "" : ` body=${trunc(JSON.stringify(body), maxBodyLen())}`
  console.info(`${PREFIX} → ${method} ${apiPath}${b}`)
}

export function logSalesforceHttpResponse(
  method: string,
  apiPath: string,
  status: number,
  headers: Headers,
  rawText: string
): void {
  if (!isSalesforceHttpDebug()) return
  const limit = headers.get("Sforce-Limit-Info")
  const limitLine = limit ? ` sforce-limit=${limit}` : ""
  console.info(
    `${PREFIX} ← ${method} ${apiPath} status=${status}${limitLine} body=${trunc(rawText, maxBodyLen())}`
  )
}

/** Token endpoint: never log response bodies on success (contains access_token). */
export function logSalesforceTokenRequest(grantLabel = "oauth"): void {
  if (!isSalesforceHttpDebug()) return
  console.info(`${PREFIX} → POST /services/oauth2/token (grant=${grantLabel}, secrets redacted)`)
}

export function logSalesforceTokenResponse(status: number, ok: boolean, err?: { error?: string; description?: string }): void {
  if (!isSalesforceHttpDebug()) return
  if (ok) {
    console.info(`${PREFIX} ← POST /services/oauth2/token status=${status} ok=true (response body omitted)`)
    return
  }
  const msg = [err?.error, err?.description].filter(Boolean).join(": ") || "error"
  console.info(`${PREFIX} ← POST /services/oauth2/token status=${status} ${trunc(msg, 800)}`)
}
