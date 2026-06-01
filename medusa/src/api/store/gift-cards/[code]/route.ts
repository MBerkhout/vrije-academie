import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import GiftCardModuleService from "../../../../modules/gift-card/service"
import { GIFT_CARD_MODULE } from "../../../../modules/gift-card"

/**
 * GET /store/gift-cards/:code
 *
 * Public balance check for a code (no PII). Used for lightweight validation in the storefront.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const gift = req.scope.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>
  const raw = req.params.code as string
  if (!raw?.trim()) {
    res.status(400).json({ message: "code is required" })
    return
  }

  try {
    const normalized = gift.normalizeCode(raw)
    const card = await gift.getByCode(normalized)
    if (!card) {
      res.status(404).json({ message: "Gift card not found" })
      return
    }
    res.status(200).json({
      code: normalized,
      status: card.status,
      currency_code: card.currency_code,
      balance: card.balance,
    })
  } catch (e: any) {
    if (e instanceof MedusaError) {
      res.status(400).json({ message: e.message })
      return
    }
    throw e
  }
}
