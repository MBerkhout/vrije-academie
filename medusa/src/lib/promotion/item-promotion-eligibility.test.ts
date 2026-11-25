import { ApplicationMethodTargetType } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import { filterApplicableCartLineItems, GIFT_CARD_ITEM_RULE_ATTRIBUTE } from "./item-promotion-eligibility"

function rulesMatchGiftCard(item: { is_giftcard?: boolean }) {
  return item.is_giftcard === true
}

const areRulesValidForContext = (
  rules: Array<{ attribute?: string }> | undefined,
  item: { is_giftcard?: boolean },
  _scope: string
) => {
  if (!rules?.length) return false
  if (rules.some((r) => r.attribute === GIFT_CARD_ITEM_RULE_ATTRIBUTE)) {
    return rulesMatchGiftCard(item)
  }
  return true
}

describe("filterApplicableCartLineItems", () => {
  const giftLine = {
    id: "li_gift",
    subtotal: 50,
    quantity: 1,
    is_discountable: false,
    is_giftcard: true,
  }

  const sessionLine = {
    id: "li_evt",
    subtotal: 50,
    quantity: 1,
    is_discountable: true,
    is_giftcard: false,
  }

  it("excludes non-discountable gift lines when promotion has no target rules", () => {
    const result = filterApplicableCartLineItems([giftLine], { application_method: {} }, areRulesValidForContext)
    expect(result).toEqual([])
  })

  it("includes non-discountable gift lines when target rule matches is_giftcard", () => {
    const promotion = {
      application_method: {
        target_type: ApplicationMethodTargetType.ITEMS,
        target_rules: [
          {
            attribute: GIFT_CARD_ITEM_RULE_ATTRIBUTE,
            operator: "eq",
            values: [{ value: "true" }],
          },
        ],
      },
    }
    const result = filterApplicableCartLineItems([giftLine, sessionLine], promotion, areRulesValidForContext)
    expect(result.map((i) => i.id)).toEqual(["li_gift"])
  })
})