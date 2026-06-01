import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"

import GiftCardModuleService from "../../../modules/gift-card/service"
import { GIFT_CARD_MODULE } from "../../../modules/gift-card"

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  code: z.string().optional(),
  email: z.string().optional(),
  order_id: z.string().optional(),
})

/**
 * GET /admin/gift-cards
 *
 * Paginated list with optional filters (exact match on code after normalization, email, purchase order id).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const q = QuerySchema.parse(req.query)
  const gift = req.scope.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>

  const filters: Record<string, string> = {}
  if (q.code?.trim()) {
    filters.code = gift.normalizeCode(q.code)
  }
  if (q.email?.trim()) {
    filters.recipient_email = q.email.trim().toLowerCase()
  }
  if (q.order_id?.trim()) {
    filters.purchased_by_order_id = q.order_id.trim()
  }

  const [gift_cards, count] = await gift.listAndCountGiftCards(filters, {
    take: q.limit,
    skip: q.offset,
    order: { created_at: "DESC" },
  })

  res.json({
    gift_cards,
    count,
    limit: q.limit,
    offset: q.offset,
  })
}
