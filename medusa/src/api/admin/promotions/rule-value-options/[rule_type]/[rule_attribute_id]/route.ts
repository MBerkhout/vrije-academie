import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

import {
  EVENT_PROMOTION_RULE_ATTRIBUTE_IDS,
  isEventPromotionRuleAttributeId,
} from "../../../../../../lib/promotion-event-rule-attributes"
import {
  ruleQueryConfigurations,
  validateRuleAttribute,
  validateRuleType,
} from "../../../../../../lib/medusa-core-imports"
import CatalogModuleService from "../../../../../../modules/catalog/service"

type CatalogCity = {
  slug: string
  label: string
}

/**
 * GET /admin/promotions/rule-value-options/:rule_type/:rule_attribute_id
 *
 * Extends core rule value options with catalog cities for event city conditions.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { rule_type: ruleType, rule_attribute_id: ruleAttributeId } = req.params
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const filterableFields = { ...(req.filterableFields as Record<string, unknown>) }

  validateRuleType(ruleType)

  if (ruleAttributeId === EVENT_PROMOTION_RULE_ATTRIBUTE_IDS.event_city) {
    if (filterableFields.application_method_target_type) {
      delete filterableFields.application_method_target_type
    }

    const catalog = req.scope.resolve("catalog") as InstanceType<
      typeof CatalogModuleService
    >
    const cities = (await catalog.listCities(
      {},
      { order: { sort_order: "ASC" } }
    )) as CatalogCity[]

    const q =
      typeof filterableFields.q === "string"
        ? filterableFields.q.trim().toLowerCase()
        : ""
    const filtered = q
      ? cities.filter(
          (city) =>
            city.label.toLowerCase().includes(q) ||
            city.slug.toLowerCase().includes(q)
        )
      : cities

    const values = filtered.map((city) => ({
      label: city.label,
      value: city.slug,
    }))

    res.json({
      values,
      count: values.length,
      offset: 0,
      limit: values.length,
    })
    return
  }

  if (isEventPromotionRuleAttributeId(ruleAttributeId)) {
    res.json({
      values: [],
      count: 0,
      offset: 0,
      limit: 0,
    })
    return
  }

  const queryConfig =
    ruleQueryConfigurations[
      ruleAttributeId as keyof typeof ruleQueryConfigurations
    ]

  if (!queryConfig) {
    res.json({
      values: [],
      count: 0,
      offset: 0,
      limit: 0,
    })
    return
  }

  if (filterableFields.value) {
    filterableFields[queryConfig.valueAttr] = filterableFields.value
    delete filterableFields.value
  }

  validateRuleAttribute({
    ruleType,
    ruleAttributeId,
    promotionType: undefined,
    applicationMethodType: undefined,
    applicationMethodTargetType: filterableFields.application_method_target_type as
      | string
      | undefined,
  })

  if (filterableFields.application_method_target_type) {
    delete filterableFields.application_method_target_type
  }

  const { rows, metadata } = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: queryConfig.entryPoint,
      variables: {
        filters: filterableFields,
        ...req.queryConfig.pagination,
      },
      fields: [queryConfig.labelAttr, queryConfig.valueAttr],
    })
  )

  const values = rows.map((row: Record<string, string>) => ({
    label: row[queryConfig.labelAttr],
    value: row[queryConfig.valueAttr],
  }))

  res.json({
    values,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
