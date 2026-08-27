import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
  RuleOperator,
  RuleType,
} from "@medusajs/framework/utils"
import type { AdminRuleAttributeOption } from "@medusajs/types"

import {
  EVENT_PROMOTION_RULE_ATTRIBUTE_IDS,
  findEventPromotionRuleAttribute,
  getExtendedRuleAttributesMap,
} from "../../../../../lib/promotion-event-rule-attributes"
import {
  formatPromotionRuleDisplayValue,
  getPromotionRuleOperatorLabel,
} from "../../../../../lib/promotion-rule-display"
import {
  operatorsMap,
  ruleQueryConfigurations,
  validateRuleType,
} from "../../../../../lib/medusa-core-imports"
import CatalogModuleService from "../../../../../modules/catalog/service"

type PromotionRuleRow = {
  attribute?: string
  operator?: string
  values?: { value?: string; label?: string }[] | string | number
  id?: string
}

function formatRuleValuesForResponse(
  values: PromotionRuleRow["values"],
  fieldType?: string,
  attribute?: AdminRuleAttributeOption
): string | number | { value?: string; label?: string }[] | undefined {
  if (values == null) {
    return fieldType === "number" ? undefined : []
  }

  if (fieldType === "number") {
    let raw: string | number | undefined
    if (Array.isArray(values)) {
      const first = values[0]
      if (first && typeof first === "object") {
        raw = first.value ?? ""
      } else {
        raw = first as string | number
      }
    } else {
      raw = values
    }

    return formatPromotionRuleDisplayValue(raw, attribute)
  }

  if (!Array.isArray(values)) {
    return []
  }

  return values.map((value) => ({
    value: value.value,
    label: value.label ?? value.value,
  }))
}

type PromotionRecord = {
  type?: string
  rules?: PromotionRuleRow[]
  application_method?: {
    type?: string
    target_type?: string
    target_rules?: PromotionRuleRow[]
    buy_rules?: PromotionRuleRow[]
    [key: string]: unknown
  }
}

/**
 * GET /admin/promotions/:id/:rule_type
 *
 * Fork of core rules readback that keeps custom event/price target rules visible
 * even when they have no ruleQueryConfigurations entry.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id, rule_type: ruleType } = req.params
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  validateRuleType(ruleType)

  const dasherizedRuleType = ruleType.split("-").join("_")
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "promotion",
    variables: { id },
    fields: req.queryConfig.fields,
  })

  const [promotion] = (await remoteQuery(queryObject)) as PromotionRecord[]
  const ruleAttributes =
    getExtendedRuleAttributesMap({
      promotionType:
        promotion?.type || (req.query.promotion_type as string | undefined),
      applicationMethodType:
        promotion?.application_method?.type ||
        (req.query.application_method_type as string | undefined),
      applicationMethodTargetType:
        promotion?.application_method?.target_type ||
        (req.query.application_method_target_type as string | undefined),
    })[ruleType] ?? []

  const promotionRules: PromotionRuleRow[] = []

  if (dasherizedRuleType === RuleType.RULES) {
    promotionRules.push(...(promotion?.rules ?? []))
  } else if (dasherizedRuleType === RuleType.TARGET_RULES) {
    promotionRules.push(...(promotion?.application_method?.target_rules ?? []))
  } else if (dasherizedRuleType === RuleType.BUY_RULES) {
    promotionRules.push(...(promotion?.application_method?.buy_rules ?? []))
  }

  const transformedRules: Record<string, unknown>[] = []
  const disguisedRules = ruleAttributes.filter(
    (attr: AdminRuleAttributeOption) => !!attr.disguised
  )

  for (const disguisedRule of disguisedRules) {
    const getValues = () => {
      const value = promotion?.application_method?.[disguisedRule.id as string]
      if (disguisedRule.field_type === "number") {
        return value
      }
      if (value) {
        return [{ label: value, value }]
      }
      return []
    }

    const required = disguisedRule.required ?? true
    const applicationMethod = promotion?.application_method
    const recordValue = applicationMethod?.[disguisedRule.id as string]

    if (required || recordValue) {
      transformedRules.push({
        ...disguisedRule,
        id: undefined,
        attribute: disguisedRule.id,
        attribute_label: disguisedRule.label,
        operator: RuleOperator.EQ,
        operator_label: operatorsMap[RuleOperator.EQ].label,
        value: undefined,
        values: getValues(),
      })
    }
  }

  for (const rawRule of [...promotionRules, ...transformedRules]) {
    const promotionRule = rawRule as PromotionRuleRow
    const currentRuleAttribute =
      ruleAttributes.find(
        (attr: AdminRuleAttributeOption) => attr.value === promotionRule.attribute
      ) ?? findEventPromotionRuleAttribute(String(promotionRule.attribute ?? ""))

    if (!currentRuleAttribute) {
      continue
    }

    const queryConfig =
      ruleQueryConfigurations[
        currentRuleAttribute.id as keyof typeof ruleQueryConfigurations
      ]

    if (!queryConfig) {
      const isCustomEventRule = !!findEventPromotionRuleAttribute(
        String(promotionRule.attribute ?? "")
      )
      if (!isCustomEventRule) {
        continue
      }

      let customValues = promotionRule.values
      if (
        currentRuleAttribute.id === EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_city &&
        Array.isArray(customValues)
      ) {
        const catalog = req.scope.resolve("catalog") as InstanceType<
          typeof CatalogModuleService
        >
        const cities = await catalog.listCities({})
        const cityLabelBySlug = new Map(
          cities.map((city: { slug: string; label: string }) => [
            city.slug,
            city.label,
          ])
        )
        customValues = customValues.map((value) => ({
          value: value.value,
          label:
            cityLabelBySlug.get(value.value ?? "") ??
            (value.label ?? value.value ?? ""),
        }))
      }

      if (!currentRuleAttribute.hydrate) {
        transformedRules.push({
          ...currentRuleAttribute,
          ...promotionRule,
          values: formatRuleValuesForResponse(
            customValues,
            currentRuleAttribute.field_type,
            currentRuleAttribute
          ),
          attribute_label: currentRuleAttribute.label,
          operator_label: getPromotionRuleOperatorLabel(
            promotionRule.operator,
            currentRuleAttribute
          ),
        })
      }
      continue
    }

    const ruleValues = Array.isArray(promotionRule.values)
      ? promotionRule.values
      : []

    const rows = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: queryConfig.entryPoint,
        variables: {
          filters: {
            [queryConfig.valueAttr]: ruleValues.map((v) => v.value),
          },
        },
        fields: [queryConfig.labelAttr, queryConfig.valueAttr],
      })
    )

    const valueLabelMap = new Map(
      rows.map((row: Record<string, string>) => [
        row[queryConfig.valueAttr],
        row[queryConfig.labelAttr],
      ])
    )

    const hydratedValues = ruleValues.map((value) => ({
      value: value.value,
      label: String(
        valueLabelMap.get(value.value ?? "") ?? value.label ?? value.value ?? ""
      ),
    }))

    if (!currentRuleAttribute.hydrate) {
      transformedRules.push({
        ...currentRuleAttribute,
        ...promotionRule,
        values: formatRuleValuesForResponse(
          hydratedValues,
          currentRuleAttribute.field_type,
          currentRuleAttribute
        ),
        attribute_label: currentRuleAttribute.label,
        operator_label: getPromotionRuleOperatorLabel(
          promotionRule.operator,
          currentRuleAttribute
        ),
      })
    }
  }

  res.json({ rules: transformedRules })
}
