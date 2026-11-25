import { createRequire } from "node:module"
import path from "node:path"

import { getComputedActionsForItems } from "./compute-line-items-gift-cards"

const PATCHED = Symbol.for("va.promotionLineItemsGiftCard")

/**
 * Replace Medusa promotion line-item compute so non-discountable gift card lines
 * can receive item-level discounts when target rules match.
 */
export function patchPromotionLineItemsForGiftCards(): void {
  const promotionRoot = path.resolve(__dirname, "../../../node_modules/@medusajs/promotion")
  const nodeRequire = createRequire(path.join(promotionRoot, "package.json"))

  const lineItemsMod = nodeRequire(
    "./dist/utils/compute-actions/line-items.js"
  ) as {
    getComputedActionsForItems: typeof getComputedActionsForItems
    [PATCHED]?: boolean
  }

  if (lineItemsMod[PATCHED]) {
    return
  }

  lineItemsMod.getComputedActionsForItems = getComputedActionsForItems
  lineItemsMod[PATCHED] = true
}