import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { errorHandler } from "@medusajs/framework/http"

import { captureWithContext } from "../../lib/sentry"

const coreHandler = errorHandler()

/**
 * MedusaErrors carry a `type` but no HTTP status; the core handler maps these
 * to 4xx responses (e.g. invalid promotion code -> invalid_data). Don't report them.
 */
const CLIENT_ERROR_TYPES = new Set([
  "invalid_data",
  "not_found",
  "not_allowed",
  "unauthorized",
  "conflict",
  "duplicate_error",
  "invalid_argument",
])

function isClientMedusaError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false
  const type = (err as { type?: unknown }).type
  return typeof type === "string" && CLIENT_ERROR_TYPES.has(type)
}

export function medusaSentryErrorHandler(
  err: unknown,
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void {
  const statusCode =
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status?: unknown }).status === "number"
      ? (err as { status: number }).status
      : typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : isClientMedusaError(err)
          ? 400
          : 500

  const shouldCapture = statusCode >= 500 || statusCode === 0
  if (shouldCapture) {
    const path = req.originalUrl ?? req.url ?? ""
    captureWithContext(err, {
      tags: {
        kind: "http",
        method: req.method ?? "UNKNOWN",
        route: path.split("?")[0] ?? path,
      },
      extra: { statusCode },
    })
  }

  coreHandler(err, req, res, next)
}
