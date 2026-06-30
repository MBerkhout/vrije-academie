import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { buildCheckoutConfirmation } from "../../../../lib/checkout-confirmation"

/**
 * GET /store/checkout/confirmation
 *
 * Resolves an order after Mollie redirect (poll with cart_id until status=ready).
 * Query: `order_id`, `cart_id`, and/or `payment_session_id` (Medusa payment session id).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const order_id = req.query.order_id as string | undefined
  const cart_id = req.query.cart_id as string | undefined
  const token = req.query.token as string | undefined
  const payment_session_id =
    (req.query.payment_session_id as string | undefined) ??
    (req.query.session_id as string | undefined)

  if (!order_id?.trim() && !cart_id?.trim() && !payment_session_id?.trim()) {
    res.status(400).json({
      message: "Provide order_id, cart_id, or payment_session_id (session_id)",
    })
    return
  }

  try {
    const payload = await buildCheckoutConfirmation(req.scope, {
      order_id,
      cart_id,
      payment_session_id,
      token,
    })
    res.setHeader("Cache-Control", "private, no-store")
    res.status(payload.status === "ready" ? 200 : 202).json(payload)
  } catch (e: unknown) {
    if (e instanceof MedusaError && e.type === MedusaError.Types.NOT_FOUND) {
      res.status(404).json({ message: e.message })
      return
    }
    if (e instanceof MedusaError && e.type === MedusaError.Types.NOT_ALLOWED) {
      res.status(403).json({ message: e.message })
      return
    }
    throw e
  }
}
