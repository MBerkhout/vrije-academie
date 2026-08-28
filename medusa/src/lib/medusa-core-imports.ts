import { createRequire } from "node:module"
import path from "node:path"

const medusaPackageRoot = path.resolve(
  __dirname,
  "../../node_modules/@medusajs/medusa"
)
const nodeRequire = createRequire(path.join(medusaPackageRoot, "package.json"))

/**
 * Runtime deep-imports from @medusajs/medusa.
 * Re-verify these paths on every Medusa upgrade.
 */
const promotionUtils = nodeRequire(
  "./dist/api/admin/promotions/utils"
) as {
  getRuleAttributesMap: (params: {
    promotionType?: string
    applicationMethodType?: string
    applicationMethodTargetType?: string
  }) => Record<string, import("@medusajs/types").AdminRuleAttributeOption[]>
  operatorsMap: Record<
    string,
    { id: string; value: string; label: string }
  >
  ruleQueryConfigurations: Record<
    string,
    { entryPoint: string; labelAttr: string; valueAttr: string }
  >
  validateRuleAttribute: (args: Record<string, unknown>) => void
  validateRuleType: (ruleType: string) => void
}

const cartHelpers = nodeRequire("./dist/api/store/carts/helpers") as {
  refetchCart: (
    id: string,
    scope: { resolve: (key: string) => unknown },
    fields: string[]
  ) => Promise<Record<string, unknown>>
}

const cartQueryConfig = nodeRequire("./dist/api/store/carts/query-config") as {
  defaultStoreCartFields: string[]
}

export const getRuleAttributesMap = promotionUtils.getRuleAttributesMap
export const operatorsMap = promotionUtils.operatorsMap
export const ruleQueryConfigurations = promotionUtils.ruleQueryConfigurations
export const validateRuleAttribute = promotionUtils.validateRuleAttribute
export const validateRuleType = promotionUtils.validateRuleType
export const refetchCart = cartHelpers.refetchCart
export const defaultStoreCartFields = cartQueryConfig.defaultStoreCartFields
