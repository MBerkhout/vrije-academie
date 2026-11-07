import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import * as Sentry from "@sentry/node"
import { performance } from "node:perf_hooks"

const SLOW_STORE_MS = Number(process.env.STORE_SLOW_REQUEST_MS) || 500

function headerValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

function applyStoreScopeTags(req: MedusaRequest): void {
  const path = req.originalUrl ?? req.url ?? ""
  const route = path.split("?")[0] ?? path
  const scope = Sentry.getCurrentScope()
  scope.setTag("http.route", route)
  scope.setTag("http.method", req.method ?? "GET")
  const auth = (req as { auth_context?: { actor_id?: string } }).auth_context
  if (auth?.actor_id) {
    scope.setTag("customer_id", auth.actor_id)
  }
}

export async function storeRequestTiming(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> {
  const start = performance.now()
  const sentryTrace = headerValue(req.headers["sentry-trace"])
  const baggage = headerValue(req.headers.baggage)

  const run = async () => {
    applyStoreScopeTags(req)
    await next()
  }

  if (sentryTrace || baggage) {
    await Sentry.continueTrace({ sentryTrace, baggage }, run)
  } else {
    await run()
  }

  const ms = Math.round(performance.now() - start)
  const path = req.originalUrl ?? req.url ?? ""
  if (!path.includes("/store")) return

  try {
    res.setHeader("Server-Timing", `total;dur=${ms}`)
  } catch {
    /* response already sent */
  }

  if (ms >= SLOW_STORE_MS) {
    console.info(
      JSON.stringify({
        tag: "store-slow",
        method: req.method,
        path,
        status: res.statusCode,
        ms,
      })
    )
  }
}
