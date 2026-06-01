import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import { applyGiftCardCode, removeGiftCardCode } from "../../../../lib/gift-card-cart"

const applySchema = z.object({
  cart_id: z.string().min(1),
  code: z.string().min(1),
})

const removeSchema = z.object({
  cart_id: z.string().min(1),
  code: z.string().min(1),
})

/**
 * POST /store/cart/gift-cards — apply a balance-backed gift card (cart credit line + reserve).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = applySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", issues: parsed.error.flatten() })
    return
  }
  try {
    const { cart, applied_amount, remaining_balance } = await applyGiftCardCode(
      req.scope,
      parsed.data.cart_id,
      parsed.data.code
    )
    res.status(200).json({ cart, applied_amount, remaining_balance })
  } catch (e: any) {
    if (e instanceof MedusaError) {
      const status =
        e.type === MedusaError.Types.NOT_FOUND
          ? 404
          : e.type === MedusaError.Types.NOT_ALLOWED
            ? 403
            : 400
      res.status(status).json({ message: e.message })
      return
    }
    throw e
  }
}

/**
 * DELETE /store/cart/gift-cards — body: { cart_id, code }
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = removeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", issues: parsed.error.flatten() })
    return
  }
  try {
    const cart = await removeGiftCardCode(
      req.scope,
      parsed.data.cart_id,
      parsed.data.code
    )
    res.status(200).json({ cart })
  } catch (e: any) {
    if (e instanceof MedusaError) {
      res.status(e.type === MedusaError.Types.NOT_FOUND ? 404 : 400).json({
        message: e.message,
      })
      return
    }
    throw e
  }
}
