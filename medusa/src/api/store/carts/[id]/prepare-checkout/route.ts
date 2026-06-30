import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ensureCartCheckoutReady } from "../../../../../lib/ensure-cart-checkout-ready"
import { refetchStoreCart } from "../../../../../lib/store-cart"

/**
 * POST /store/carts/:id/prepare-checkout
 *
 * Clears `requires_shipping` on line items so digital event registrations can
 * complete after Mollie payment without selecting a shipping method.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const cartId = req.params.id
  if (!cartId) {
    res.status(400).json({ message: "Cart id is required" })
    return
  }

  try {
    const { updated } = await ensureCartCheckoutReady(req.scope, cartId)
    const cart = await refetchStoreCart(req.scope, cartId)
    res.status(200).json({ cart, updated })
  } catch (e: unknown) {
    if (e instanceof MedusaError) {
      res.status(e.type === MedusaError.Types.NOT_FOUND ? 404 : 400).json({
        message: e.message,
      })
      return
    }
    throw e
  }
}
