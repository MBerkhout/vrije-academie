import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import { syncAccountCarts } from "../../../../lib/account-cart-sync"

const syncSchema = z.object({
  cart_id: z.string().min(1).optional(),
})

/**
 * POST /store/carts/sync
 *
 * Merge open carts for the logged-in customer into the oldest cart.
 * Optional body.cart_id transfers a guest/local cart before merging.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const parsed = syncSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", issues: parsed.error.flatten() })
    return
  }

  const customerId = req.auth_context.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const cart = await syncAccountCarts(req.scope, customerId, parsed.data.cart_id ?? null)
    res.status(200).json({ cart })
  } catch (e: unknown) {
    if (e instanceof MedusaError) {
      const status =
        e.type === MedusaError.Types.NOT_ALLOWED
          ? 403
          : e.type === MedusaError.Types.NOT_FOUND
            ? 404
            : 400
      res.status(status).json({ message: e.message })
      return
    }
    throw e
  }
}
