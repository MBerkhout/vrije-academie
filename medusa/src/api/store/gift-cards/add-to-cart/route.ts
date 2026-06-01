import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import { addGiftCardProductToCart, MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS } from "../../../../lib/gift-card-cart"
import { refetchStoreCart } from "../../../../lib/store-cart"

const bodySchema = z.object({
  cart_id: z.string().min(1),
  amount: z.number().int().min(MIN_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS),
  currency_code: z.string().min(1).optional(),
  recipient_name: z.string().min(1),
  recipient_email: z.string().email(),
  message: z.string().optional(),
  sender_name: z.string().optional(),
})

/**
 * POST /store/gift-cards/add-to-cart
 *
 * Adds a configurable digital gift card line item (custom unit price + recipient metadata).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", issues: parsed.error.flatten() })
    return
  }

  const {
    cart_id,
    amount,
    recipient_name,
    recipient_email,
    message,
    sender_name,
  } = parsed.data

  try {
    await addGiftCardProductToCart({
      container: req.scope,
      cartId: cart_id,
      amountCents: amount,
      recipient_name,
      recipient_email,
      message,
      sender_name,
    })

    const full = await refetchStoreCart(req.scope, cart_id)
    res.status(200).json({ cart: full })
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
