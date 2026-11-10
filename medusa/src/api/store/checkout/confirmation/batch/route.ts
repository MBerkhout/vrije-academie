import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { buildCheckoutConfirmation } from "../../../../../lib/checkout-confirmation"

const MAX_ORDERS = 50

/**
 * GET /store/checkout/confirmation/batch?order_id=a&order_id=b
 *
 * Batch variant of GET /store/checkout/confirmation for the account order list
 * (avoids one request per order). Same access model as the single endpoint
 * (order_id only). Returns `{ confirmations: { [order_id]: payload } }`;
 * unknown or forbidden orders are omitted.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const raw = req.query.order_id
  const ids = [
    ...new Set(
      (Array.isArray(raw) ? raw : raw ? [raw] : [])
        .map((v) => String(v).trim())
        .filter(Boolean)
    ),
  ].slice(0, MAX_ORDERS)

  if (ids.length === 0) {
    res.status(400).json({ message: "Provide at least one order_id" })
    return
  }

  const entries = await Promise.all(
    ids.map(async (order_id) => {
      try {
        const payload = await buildCheckoutConfirmation(req.scope, { order_id })
        return [order_id, payload] as const
      } catch (e: unknown) {
        if (
          e instanceof MedusaError &&
          (e.type === MedusaError.Types.NOT_FOUND || e.type === MedusaError.Types.NOT_ALLOWED)
        ) {
          return null
        }
        throw e
      }
    })
  )

  res.setHeader("Cache-Control", "private, no-store")
  res.status(200).json({
    confirmations: Object.fromEntries(entries.filter((e) => e != null)),
  })
}
