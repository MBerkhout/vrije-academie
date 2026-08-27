import type { AdminRuleAttributeOption } from "@medusajs/types"
import { RuleOperator } from "@medusajs/framework/utils"

import {
  EVENT_PROMOTION_RULE_ATTRIBUTE_IDS,
  eventPromotionRuleAttributes,
} from "./promotion-event-rule-attributes"

const operatorLabels: Record<string, string> = {
  [RuleOperator.GT]: "Greater than",
  [RuleOperator.GTE]: "Greater than or equal",
  [RuleOperator.LT]: "Less than",
  [RuleOperator.LTE]: "Less than or equal",
  [RuleOperator.EQ]: "Equal",
  [RuleOperator.NE]: "Not equal",
  [RuleOperator.IN]: "In",
}

export function formatYyyymmddForDisplay(value: unknown): string | null {
  const parsed =
    typeof value === "string" || typeof value === "number"
      ? Number.parseInt(String(value), 10)
      : NaN

  if (!Number.isFinite(parsed) || parsed < 10000101) {
    return null
  }

  const raw = String(parsed)
  const year = Number.parseInt(raw.slice(0, 4), 10)
  const month = Number.parseInt(raw.slice(4, 6), 10)
  const day = Number.parseInt(raw.slice(6, 8), 10)

  if (!year || !month || !day) {
    return null
  }

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
}

export function isEventStartDateRuleAttributeId(id: string | undefined): boolean {
  return (
    id === EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_start_from ||
    id === EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_start_until
  )
}

export function getPromotionRuleOperatorLabel(
  operator: string | undefined,
  attribute?: AdminRuleAttributeOption
): string {
  if (!operator) {
    return ""
  }

  const attributeOperator = attribute?.operators?.find(
    (entry) => entry.value === operator
  )?.label

  if (attributeOperator) {
    return attributeOperator
  }

  return operatorLabels[operator] ?? operator
}

export function formatPromotionRuleDisplayValue(
  value: unknown,
  attribute?: AdminRuleAttributeOption
): string | number {
  if (value == null || value === "") {
    return ""
  }

  if (isEventStartDateRuleAttributeId(attribute?.id)) {
    return formatYyyymmddForDisplay(value) ?? String(value)
  }

  if (attribute?.id === EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.item_unit_price) {
    const amount =
      typeof value === "number" ? value : Number.parseFloat(String(value))
    if (Number.isFinite(amount)) {
      return `€${amount}`
    }
  }

  return typeof value === "number" ? value : String(value)
}

export function findEventAttributeOperatorLabel(operator: string): string {
  for (const attribute of eventPromotionRuleAttributes) {
    const match = attribute.operators?.find((entry) => entry.value === operator)
    if (match?.label) {
      return match.label
    }
  }

  return operatorLabels[operator] ?? operator
}
