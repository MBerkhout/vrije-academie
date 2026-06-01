import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import GiftCardModuleService from "../../../../modules/gift-card/service"
import { GIFT_CARD_MODULE } from "../../../../modules/gift-card"

/**
 * GET /admin/gift-cards/:id
 *
 * Single gift card with recent ledger rows (newest first).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  if (!id?.trim()) {
    res.status(400).json({ message: "id is required" })
    return
  }

  const gift = req.scope.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>

  try {
    const card = await gift.retrieveGiftCard(id)
    const transactions = await gift.listGiftCardTransactions(
      { gift_card_id: id },
      { order: { created_at: "DESC" }, take: 100 }
    )
    res.json({ gift_card: card, transactions })
  } catch (e: unknown) {
    if (e instanceof MedusaError && e.type === MedusaError.Types.NOT_FOUND) {
      res.status(404).json({ message: "Gift card not found" })
      return
    }
    throw e
  }
}
