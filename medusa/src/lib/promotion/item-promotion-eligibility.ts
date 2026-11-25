import type { BigNumberInput } from "@medusajs/framework/types"
import {
  ApplicationMethodTargetType,
  MathBN,
} from "@medusajs/framework/utils"

/** Stored on promotion_rule.attribute when targeting gift card purchase lines. */
export const GIFT_CARD_ITEM_RULE_ATTRIBUTE = "items.is_giftcard"

export type PromotionTargetRulesCarrier = {
  application_method?: {
    target_type?: string
    target_rules?: Array<{
      attribute?: string
      operator?: string
      values?: Array<{ value?: string }>
    }>
  }
}

type CartLineItemLike = {
  id?: string
  subtotal?: unknown
  quantity?: unknown
  is_discountable?: boolean
  is_giftcard?: boolean
  metadata?: Record<string, unknown> | null
  [key: string]: unknown
}

type RuleValidator = (
  rules: PromotionTargetRulesCarrier["application_method"] extends infer M
    ? M extends { target_rules?: infer R }
      ? R
      : never
    : never,
  context: CartLineItemLike,
  contextScope: string
) => boolean

/**
 * Medusa skips line items with `is_discountable: false` before target rules run.
 * Gift card products are non-discountable by default; allow them when target rules
 * explicitly match the line (e.g. `items.is_giftcard` = true).
 */
export function filterApplicableCartLineItems(
  items: CartLineItemLike[],
  promotion: PromotionTargetRulesCarrier,
  areRulesValidForContext: RuleValidator
): CartLineItemLike[] {
  if (!items?.length || !promotion?.application_method) {
    return []
  }

  const isTargetShippingMethod =
    promotion.application_method.target_type ===
    ApplicationMethodTargetType.SHIPPING_METHODS
  const targetRules = promotion.application_method.target_rules ?? []
  const hasTargetRules = targetRules.length > 0

  if (isTargetShippingMethod && !hasTargetRules) {
    return items.filter(
      (item) => item && "subtotal" in item && MathBN.gt(item.subtotal as BigNumberInput, 0)
    )
  }

  return items.filter((item) => {
    if (!item) {
      return false
    }

    if ("is_discountable" in item && item.is_discountable === false) {
      if (!hasTargetRules) {
        return false
      }
      const matches = areRulesValidForContext(
        targetRules,
        item,
        ApplicationMethodTargetType.ITEMS
      )
      if (!matches) {
        return false
      }
    }

    if (!("subtotal" in item) || MathBN.lte(item.subtotal as BigNumberInput, 0)) {
      return false
    }

    if (!isTargetShippingMethod && !("quantity" in item)) {
      return false
    }

    if (!hasTargetRules) {
      return true
    }

    return areRulesValidForContext(
      targetRules,
      item,
      ApplicationMethodTargetType.ITEMS
    )
  })
}