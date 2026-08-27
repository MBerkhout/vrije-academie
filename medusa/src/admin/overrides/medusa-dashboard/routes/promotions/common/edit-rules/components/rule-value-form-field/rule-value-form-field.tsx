/**
 * Drop-in replacement for @medusajs/dashboard RuleValueFormField (via admin Vite alias).
 * Adds a DatePicker for event start date promotion target rules.
 */
import {
  ApplicationMethodTargetTypeValues,
  HttpTypes,
  RuleTypeValues,
} from "@medusajs/types"
import { DatePicker, Input } from "@medusajs/ui"
import { useEffect } from "react"
import { I18nProvider } from "react-aria"
import { useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "@dashboard/components/common/form"
import { Combobox } from "@dashboard/components/inputs/combobox"
import { useStore } from "@dashboard/hooks/api"
import { useComboboxData } from "@dashboard/hooks/use-combobox-data"
import { sdk } from "@dashboard/lib/client"
import {
  isEventStartDateRuleAttributeId,
  isEventStartDateRuleAttributeValue,
  localDateToYyyymmdd,
  yyyymmddToLocalDate,
} from "./promotion-rule-date"

type RuleValueFormFieldType = {
  form: any
  identifier: string
  scope: "application_method.buy_rules" | "rules" | "application_method.target_rules"
  name: string
  operator: string
  fieldRule: any
  attributes: HttpTypes.AdminRuleAttributeOption[]
  ruleType: RuleTypeValues
  applicationMethodTargetType: ApplicationMethodTargetTypeValues | undefined
}

const buildFilters = (attribute?: string, store?: HttpTypes.AdminStore) => {
  if (!attribute || !store) {
    return {}
  }

  if (attribute === "currency_code") {
    return {
      value: store.supported_currencies?.map((c) => c.currency_code),
    }
  }

  return {}
}

export const RuleValueFormField = ({
  form,
  identifier,
  scope,
  name,
  operator,
  fieldRule,
  attributes,
  ruleType,
  applicationMethodTargetType,
}: RuleValueFormFieldType) => {
  const { t } = useTranslation()

  const attribute = attributes?.find((attr) => attr.value === fieldRule.attribute)
  const isEventStartDateRule =
    isEventStartDateRuleAttributeId(attribute?.id) ||
    isEventStartDateRuleAttributeValue(fieldRule.attribute)

  const { store, isLoading: isStoreLoading } = useStore()

  const comboboxData = useComboboxData({
    queryFn: async (params) => {
      return await sdk.admin.promotion.listRuleValues(
        ruleType,
        attribute?.id!,
        {
          ...params,
          ...buildFilters(attribute?.id, store!),
          application_method_target_type: applicationMethodTargetType,
        }
      )
    },
    enabled:
      !!attribute?.id &&
      ["select", "multiselect"].includes(attribute.field_type) &&
      !isStoreLoading,
    getOptions: (data) => data.values,
    queryKey: ["rule-value-options", ruleType, attribute?.id],
  })

  const watchOperator = useWatch({
    control: form.control,
    name: operator,
  })

  useEffect(() => {
    const hasDirtyRules = Object.keys(form.formState.dirtyFields).length > 0

    if (!hasDirtyRules) {
      return
    }

    if (watchOperator === "eq") {
      form.setValue(name, "")
    } else {
      form.setValue(name, [])
    }
  }, [watchOperator, form, name])

  return (
    <Form.Field
      key={`${identifier}.${scope}.${name}-${fieldRule.attribute}`}
      name={name}
      render={({ field: { onChange, ref, ...field } }) => {
        if (attribute?.field_type === "number" && isEventStartDateRule) {
          const selectedDate = yyyymmddToLocalDate(field.value)

          return (
            <Form.Item className="basis-1/2">
              <Form.Control>
                <I18nProvider locale="en-GB">
                  <DatePicker
                    granularity="day"
                    shouldCloseOnSelect
                    value={selectedDate}
                    onChange={(date) => {
                      const ymd = localDateToYyyymmdd(date)
                      onChange(ymd || "")
                    }}
                    className="bg-ui-bg-base"
                  />
                </I18nProvider>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )
        }

        if (attribute?.field_type === "number") {
          return (
            <Form.Item className="basis-1/2">
              <Form.Control>
                <Input
                  {...field}
                  type="number"
                  onChange={onChange}
                  className="bg-ui-bg-base"
                  ref={ref}
                  min={1}
                  disabled={!fieldRule.attribute}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )
        }

        if (attribute?.field_type === "text") {
          return (
            <Form.Item className="basis-1/2">
              <Form.Control>
                <Input
                  {...field}
                  ref={ref}
                  onChange={onChange}
                  className="bg-ui-bg-base"
                  disabled={!fieldRule.attribute}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )
        }

        return (
          <Form.Item className="basis-1/2">
            <Form.Control>
              <Combobox
                {...field}
                {...comboboxData}
                ref={ref}
                placeholder={
                  watchOperator === "eq"
                    ? t("labels.selectValue")
                    : t("labels.selectValues")
                }
                disabled={!watchOperator}
                onChange={onChange}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )
      }}
    />
  )
}
