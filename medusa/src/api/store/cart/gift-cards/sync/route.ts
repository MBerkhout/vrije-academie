import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import { syncGiftCardCreditLines } from "../../../../../lib/gift-card-cart"

const syncSchema = z.object({
  cart_id: z.string().min(1),
})

/**
 * POST /store/cart/gift-cards/sync
 *
 * Re-applies gift cards listed in cart.metadata.gift_card_redemptions after line items or promos changed.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = syncSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", issues: parsed.error.flatten() })
    return
  }
  try {
    const cart = await syncGiftCardCreditLines(req.scope, parsed.data.cart_id)
    res.status(200).json({ cart })
  } catch (e: any) {
    if (e instanceof MedusaError) {
      res.status(400).json({ message: e.message })
      return
    }
    throw e
  }
}
