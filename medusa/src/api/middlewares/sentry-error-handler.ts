import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { errorHandler } from "@medusajs/framework/http"

import { captureWithContext } from "../../lib/sentry"

const coreHandler = errorHandler()

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
