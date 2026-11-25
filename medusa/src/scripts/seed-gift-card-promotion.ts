import type { ExecArgs } from "@medusajs/framework/types"
import {
  ApplicationMethodAllocation,
  ApplicationMethodTargetType,
  ApplicationMethodType,
  Modules,
  PromotionStatus,
  PromotionType,
  RuleOperator,
  RuleType,
} from "@medusajs/framework/utils"
import {
  batchPromotionRulesWorkflowId,
  createPromotionsWorkflowId,
} from "@medusajs/medusa/core-flows"

import {
  EVENT_PROMOTION_RULE_ATTRIBUTE_IDS,
  GIFT_CARD_PURCHASE_RULE_VALUE,
} from "../lib/promotion-event-rule-attributes"
import { GIFT_CARD_ITEM_RULE_ATTRIBUTE } from "../lib/promotion/item-promotion-eligibility"

/**
 * Idempotent: example −20% on gift card purchase lines only (manual code + automatic variant).
 *
 * Env:
 * - GIFT_CARD_PROMO_CODE (default: CADEAU20) — manual promotion code
 * - GIFT_CARD_AUTO_PROMO_CODE (default: AUTO-CADEAU20) — automatic promotion code
 * - GIFT_CARD_PROMO_PERCENT (default: 20)
 *
 * Run: npm run seed:gift-card-promotion
 */
export default async function seedGiftCardPromotion({ container, args }: ExecArgs) {
  const manualCode =
    process.env.GIFT_CARD_PROMO_CODE?.trim() ||
    args?.find((a) => a.startsWith("--code="))?.slice("--code=".length) ||
    "CADEAU20"
  const autoCode = process.env.GIFT_CARD_AUTO_PROMO_CODE?.trim() || "AUTO-CADEAU20"
  const percent = Number.parseInt(process.env.GIFT_CARD_PROMO_PERCENT ?? "20", 10)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    throw new Error("GIFT_CARD_PROMO_PERCENT must be 1–100")
  }

  const promotionModule = container.resolve(Modules.PROMOTION) as {
    listPromotions: (filters: { code: string }, config?: { take?: number }) => Promise<{ id: string }[]>
  }
  const we = container.resolve(Modules.WORKFLOW_ENGINE)

  async function ensurePromotion(input: {
    code: string
    is_automatic: boolean
  }) {
    const existing = await promotionModule.listPromotions({ code: input.code }, { take: 1 })
    if (existing.length) {
      console.log(`✓ Promotion already exists: ${input.code} (${existing[0].id})`)
      return existing[0].id
    }

    const { result } = await we.run(createPromotionsWorkflowId, {
      input: {
        promotionsData: [
          {
            code: input.code,
            type: PromotionType.STANDARD,
            status: PromotionStatus.ACTIVE,
            is_automatic: input.is_automatic,
            is_tax_inclusive: true,
            application_method: {
              type: ApplicationMethodType.PERCENTAGE,
              target_type: ApplicationMethodTargetType.ITEMS,
              allocation: ApplicationMethodAllocation.EACH,
              value: percent,
              currency_code: "eur",
            },
          },
        ],
      },
    })

    const created = result?.[0]?.id
    if (!created) {
      throw new Error(`Failed to create promotion ${input.code}`)
    }

    await we.run(batchPromotionRulesWorkflowId, {
      input: {
        id: created,
        rule_type: RuleType.TARGET_RULES,
        create: [
          {
            attribute: GIFT_CARD_ITEM_RULE_ATTRIBUTE,
            operator: RuleOperator.EQ,
            values: [GIFT_CARD_PURCHASE_RULE_VALUE],
          },
        ],
      },
    })

    console.log(
      `✓ Created ${input.is_automatic ? "automatic" : "manual"} promotion ${input.code} (−${percent}% on ${EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.item_is_giftcard})`
    )
    return created
  }

  await ensurePromotion({ code: manualCode, is_automatic: false })
  await ensurePromotion({ code: autoCode, is_automatic: true })
}