import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getExtendedRuleAttributesMap } from "../../../../../lib/promotion-event-rule-attributes"
import { validateRuleType } from "../../../../../lib/medusa-core-imports"

/**
 * GET /admin/promotions/rule-attribute-options/:rule_type
 *
 * Extends core rule attributes with event session conditions for item target rules.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { rule_type: ruleType } = req.params
  validateRuleType(ruleType)

  const attributes =
    getExtendedRuleAttributesMap({
      promotionType: req.query.promotion_type as string | undefined,
      applicationMethodType: req.query.application_method_type as
        | string
        | undefined,
      applicationMethodTargetType: req.query
        .application_method_target_type as string | undefined,
    })[ruleType] ?? []

  res.json({ attributes })
}
