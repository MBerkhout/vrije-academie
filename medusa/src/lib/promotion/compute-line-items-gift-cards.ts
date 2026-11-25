/**
 * Fork of @medusajs/promotion compute-actions/line-items with gift-card eligibility.
 * Re-verify when upgrading Medusa.
 */
import {
  ApplicationMethodAllocation,
  ApplicationMethodTargetType,
  calculateAdjustmentAmountFromPromotion,
  ComputedActions,
  MedusaError,
  MathBN,
} from "@medusajs/framework/utils"

import { createRequire } from "node:module"
import path from "node:path"

import { filterApplicableCartLineItems } from "./item-promotion-eligibility"

const promotionRoot = path.resolve(__dirname, "../../../node_modules/@medusajs/promotion")
const nodeRequire = createRequire(path.join(promotionRoot, "package.json"))

const { areRulesValidForContext } = nodeRequire(
  "./dist/utils/validations/promotion-rule.js"
) as {
  areRulesValidForContext: (
    rules: unknown,
    context: unknown,
    contextScope: string
  ) => boolean
}

const { sortLineItemByPriceAscending } = nodeRequire(
  "./dist/utils/compute-actions/sort-by-price.js"
) as {
  sortLineItemByPriceAscending: (a: unknown, b: unknown) => number
}

const { computeActionForBudgetExceeded } = nodeRequire(
  "./dist/utils/compute-actions/usage.js"
) as {
  computeActionForBudgetExceeded: (
    promotion: unknown,
    amount: unknown,
    attributeUsage?: unknown
  ) => unknown
}

function validateContext(contextKey: string, context: unknown) {
  if (!context) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `"${contextKey}" should be present as an array in the context for computeActions`
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PromotionLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CartLineLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComputedAction = any

export function getComputedActionsForItems(
  promotion: PromotionLike,
  items: CartLineLike[],
  appliedPromotionsMap: Map<string, any>,
  allocationOverride?: string,
  attributeUsage?: unknown
): ComputedAction[] {
  validateContext("items", items)
  return applyPromotionToItems(
    promotion,
    items,
    appliedPromotionsMap,
    allocationOverride,
    attributeUsage
  )
}

function applyPromotionToItems(
  promotion: PromotionLike,
  items: CartLineLike[],
  appliedPromotionsMap: Map<string, any>,
  allocationOverride?: string,
  attributeUsage?: unknown
): ComputedAction[] {
  const { application_method: applicationMethod } = promotion
  if (!applicationMethod) {
    return []
  }

  const allocation = applicationMethod?.allocation || allocationOverride
  const target = applicationMethod?.target_type
  if (!items?.length || !target) {
    return []
  }

  const computedActions: ComputedAction[] = []
  let applicableItems: CartLineLike[] = filterApplicableCartLineItems(
    items,
    promotion,
    areRulesValidForContext
  )
  if (!applicableItems.length) {
    return computedActions
  }

  if (allocation === ApplicationMethodAllocation.ONCE) {
    applicableItems = applicableItems.sort(sortLineItemByPriceAscending)
  }

  const isTargetLineItems = target === ApplicationMethodTargetType.ITEMS
  const isTargetOrder = target === ApplicationMethodTargetType.ORDER
  const promotionValue = applicationMethod?.value ?? 0
  const maxQuantity = applicationMethod?.max_quantity
  let remainingQuota = maxQuantity ?? 0
  let lineItemsAmount = MathBN.convert(0)

  if (allocation === ApplicationMethodAllocation.ACROSS) {
    lineItemsAmount = applicableItems.reduce((acc, item) => {
      const itemBase = promotion.is_tax_inclusive ? item.original_total : item.subtotal
      const appliedExclTax = appliedPromotionsMap.get(item.id) ?? 0
      const appliedInBase = promotion.is_tax_inclusive
        ? MathBN.mult(appliedExclTax, MathBN.div(item.original_total, item.subtotal))
        : appliedExclTax
      return MathBN.sub(MathBN.add(acc, itemBase), appliedInBase)
    }, MathBN.convert(0))
    if (MathBN.lte(lineItemsAmount, 0)) {
      return computedActions
    }
  }

  for (const item of applicableItems) {
    if (allocation === ApplicationMethodAllocation.ONCE && remainingQuota <= 0) {
      break
    }
    if (MathBN.lte(promotion.is_tax_inclusive ? item.original_total : item.subtotal, 0)) {
      continue
    }

    const appliedPromoValue = appliedPromotionsMap.get(item.id) ?? 0
    const effectiveMaxQuantity =
      allocation === ApplicationMethodAllocation.ONCE
        ? Math.min(remainingQuota ?? 0, Number(item.quantity))
        : maxQuantity

    const effectiveAllocation =
      allocation === ApplicationMethodAllocation.ONCE
        ? ApplicationMethodAllocation.EACH
        : allocation

    const amount = calculateAdjustmentAmountFromPromotion(
      item,
      {
        value: promotionValue,
        applied_value: appliedPromoValue,
        is_tax_inclusive: promotion.is_tax_inclusive,
        max_quantity: effectiveMaxQuantity,
        type: applicationMethod?.type,
        allocation: effectiveAllocation,
      },
      lineItemsAmount
    )

    if (MathBN.lte(amount, 0)) {
      continue
    }

    const budgetExceededAction = computeActionForBudgetExceeded(
      promotion,
      amount,
      attributeUsage
    )
    if (budgetExceededAction) {
      computedActions.push(budgetExceededAction)
      continue
    }

    const appliedAmountExclTax = promotion.is_tax_inclusive
      ? MathBN.mult(amount, MathBN.div(item.subtotal, item.original_total))
      : amount
    appliedPromotionsMap.set(item.id, MathBN.add(appliedPromoValue, appliedAmountExclTax))

    if (allocation === ApplicationMethodAllocation.ONCE) {
      const quantityApplied = Math.min(effectiveMaxQuantity, Number(item.quantity))
      remainingQuota -= quantityApplied
    }

    if (isTargetLineItems || isTargetOrder) {
      computedActions.push({
        action: ComputedActions.ADD_ITEM_ADJUSTMENT,
        item_id: item.id,
        amount,
        code: promotion.code,
        is_tax_inclusive: promotion.is_tax_inclusive,
      })
    }
  }

  return computedActions
}