import {
  ApplicationMethodTargetType,
  RuleOperator,
} from "@medusajs/framework/utils"
import type { AdminRuleAttributeOption } from "@medusajs/types"
// Deep-import core helpers via runtime require; re-verify on Medusa upgrades.
import {
  getRuleAttributesMap,
  operatorsMap,
} from "./medusa-core-imports"

export const EVENT_PROMOTION_RULE_ATTRIBUTE_IDS = {
  item_unit_price: "item_unit_price",
  item_is_giftcard: "item_is_giftcard",
  event_start_from: "event_start_from",
  event_start_until: "event_start_until",
  event_city: "event_city",
} as const

export const GIFT_CARD_PURCHASE_RULE_VALUE = "true"

const numericOperators = [
  {
    id: RuleOperator.GT,
    value: RuleOperator.GT,
    label: "Greater than",
  },
  {
    id: RuleOperator.GTE,
    value: RuleOperator.GTE,
    label: "Greater than or equal",
  },
  {
    id: RuleOperator.LT,
    value: RuleOperator.LT,
    label: "Less than",
  },
  {
    id: RuleOperator.LTE,
    value: RuleOperator.LTE,
    label: "Less than or equal",
  },
]

const booleanEqNeOperators = [
  {
    id: RuleOperator.EQ,
    value: RuleOperator.EQ,
    label: "Equal",
  },
  {
    id: RuleOperator.NE,
    value: RuleOperator.NE,
    label: "Not equal",
  },
]

/** Extra target-rule attributes for event sessions and gift cards (items scope only). */
export const eventPromotionRuleAttributes: AdminRuleAttributeOption[] = [
  {
    id: EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.item_is_giftcard,
    value: "items.is_giftcard",
    label: "Gift card purchase",
    required: false,
    field_type: "select",
    operators: booleanEqNeOperators,
  },
  {
    id: EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.item_unit_price,
    value: "items.unit_price",
    label: "Item price (EUR)",
    required: false,
    field_type: "number",
    operators: numericOperators,
  },
  {
    id: EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_start_from,
    value: "items.metadata.event_start_from",
    label: "Event starts on or after",
    required: false,
    field_type: "number",
    operators: [
      {
        id: RuleOperator.GTE,
        value: RuleOperator.GTE,
        label: "Greater than or equal",
      },
      {
        id: RuleOperator.GT,
        value: RuleOperator.GT,
        label: "Greater than",
      },
    ],
  },
  {
    id: EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_start_until,
    value: "items.metadata.event_start_until",
    label: "Event starts on or before",
    required: false,
    field_type: "number",
    operators: [
      {
        id: RuleOperator.LTE,
        value: RuleOperator.LTE,
        label: "Less than or equal",
      },
      {
        id: RuleOperator.LT,
        value: RuleOperator.LT,
        label: "Less than",
      },
    ],
  },
  {
    id: EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_city,
    value: "items.metadata.event_city_slug",
    label: "Event city",
    required: false,
    field_type: "multiselect",
    operators: Object.values(operatorsMap),
  },
]

type RuleAttributesMapParams = {
  promotionType?: string
  applicationMethodType?: string
  applicationMethodTargetType?: string
}

export function getExtendedRuleAttributesMap(params: RuleAttributesMapParams) {
  const map = getRuleAttributesMap(params)

  if (
    params.applicationMethodTargetType === ApplicationMethodTargetType.ITEMS
  ) {
    map["target-rules"] = [
      ...(map["target-rules"] ?? []),
      ...eventPromotionRuleAttributes,
    ]
  }

  return map
}

export function findEventPromotionRuleAttribute(
  attributeValue: string
): AdminRuleAttributeOption | undefined {
  return eventPromotionRuleAttributes.find((attr) => attr.value === attributeValue)
}

export function isEventPromotionRuleAttributeId(id: string): boolean {
  return Object.values(EVENT_PROMOTION_RULE_ATTRIBUTE_IDS).includes(
    id as (typeof EVENT_PROMOTION_RULE_ATTRIBUTE_IDS)[keyof typeof EVENT_PROMOTION_RULE_ATTRIBUTE_IDS]
  )
}

/** @alias isEventPromotionRuleAttributeId */
export const isCustomPromotionRuleAttributeId = isEventPromotionRuleAttributeId

export function findCustomPromotionRuleAttribute(
  attributeValue: string
): AdminRuleAttributeOption | undefined {
  return eventPromotionRuleAttributes.find((attr) => attr.value === attributeValue)
}
