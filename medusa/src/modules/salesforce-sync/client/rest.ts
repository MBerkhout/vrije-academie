import { MedusaError } from "@medusajs/framework/utils"

import { clearSalesforceTokenCache, getSalesforceAccessToken } from "./auth"
import { logSalesforceHttpRequest, logSalesforceHttpResponse } from "./http-debug"

const RETRYABLE = new Set([429, 500, 502, 503, 504])

/** Salesforce REST API errors that should not be retried by the workflow step. */
const NON_RETRYABLE_ERROR_CODES = new Set([
  "INVALID_FIELD",
  "INVALID_FIELD_FOR_INSERT_UPDATE",
  "MALFORMED_ID",
  "REQUIRED_FIELD_MISSING",
  "STRING_TOO_LONG",
  "INVALID_EMAIL_ADDRESS",
  "INSUFFICIENT_ACCESS_OR_READONLY",
  "DUPLICATE_VALUE",
  "INVALID_CROSS_REFERENCE_KEY",
])

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function jitter(base: number): number {
  return base + Math.floor(Math.random() * 200)
}

export type SfErrorBody = Array<{ message?: string; errorCode?: string; statusCode?: string }>

export async function sfRequest<T>(
  method: string,
  path: string,
  options?: { body?: unknown; retryAuth?: boolean }
): Promise<{ data: T; status: number; rawText?: string }> {
  const apiVersion = process.env.SALESFORCE_API_VERSION?.trim() || "60.0"
  let attempt = 0
  const maxAttempts = 3
  let retryAuth = options?.retryAuth !== false

  while (attempt < maxAttempts) {
    const { access_token, instance_url } = await getSalesforceAccessToken()
    const url = `${instance_url.replace(/\/$/, "")}/services/data/v${apiVersion}${path.startsWith("/") ? path : `/${path}`}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
    }
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json"
    }

    logSalesforceHttpRequest(method, path, options?.body)

    const res = await fetch(url, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    const text = await res.text()
    logSalesforceHttpResponse(method, path, res.status, res.headers, text)

    if (res.status === 401 && retryAuth) {
      clearSalesforceTokenCache()
      retryAuth = false
      attempt++
      continue
    }

    let data: unknown
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (RETRYABLE.has(res.status) && attempt < maxAttempts - 1) {
      const delays = [200, 1000, 5000]
      await sleep(jitter(delays[attempt] ?? 5000))
      attempt++
      continue
    }

    if (!res.ok) {
      const errors = (Array.isArray(data) ? data : (data as { error?: SfErrorBody })?.error) as
        | SfErrorBody
        | undefined
      const firstCode = errors?.[0]?.errorCode
      const msg =
        errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        (typeof data === "string" ? data : text) ||
        res.statusText

      if (firstCode && NON_RETRYABLE_ERROR_CODES.has(firstCode)) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `[${firstCode}] ${msg}`)
      }

      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Salesforce ${method} ${path}: ${msg}`)
    }

    return { data: data as T, status: res.status, rawText: text }
  }

  throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Salesforce request exhausted retries")
}
