import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { performance } from "node:perf_hooks"

const SLOW_STORE_MS = Number(process.env.STORE_SLOW_REQUEST_MS) || 500

export async function storeRequestTiming(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> {
  const start = performance.now()
  await next()
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
