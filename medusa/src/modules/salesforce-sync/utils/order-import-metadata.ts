/** Medusa order metadata for Salesforce → account import (omboeking). */
export const ORDER_IMPORTED_FROM_SALESFORCE = "imported_from_salesforce"
export const ORDER_HIDDEN_FROM_ACCOUNT = "hidden_from_account"
export const ORDER_SALESFORCE_ORDER_ID = "salesforce_order_id"
export const ORDER_REPLACES_ORDER_ID = "replaces_order_id"
export const ORDER_REPLACES_SALESFORCE_ORDER_ID = "replaces_salesforce_order_id"
export const ORDER_REPLACED_BY_SALESFORCE_ORDER_ID = "replaced_by_salesforce_order_id"
export const ORDER_REPLACED_BY_MEDUSA_ORDER_ID = "replaced_by_medusa_order_id"

export const REBOOKED_REGISTRATION_STATUS = "Omgeboekt"

export function orderMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {}
  return metadata
}

export function isImportedSalesforceOrder(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return orderMetadata(metadata)[ORDER_IMPORTED_FROM_SALESFORCE] === true
}

export function isHiddenFromAccountOrder(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return orderMetadata(metadata)[ORDER_HIDDEN_FROM_ACCOUNT] === true
}

export function buildImportedOrderMetadata(input: {
  salesforceOrderId: string
  replacesSalesforceOrderId?: string | null
  replacesMedusaOrderId?: string | null
}): Record<string, unknown> {
  return {
    [ORDER_IMPORTED_FROM_SALESFORCE]: true,
    [ORDER_SALESFORCE_ORDER_ID]: input.salesforceOrderId,
    ...(input.replacesSalesforceOrderId
      ? { [ORDER_REPLACES_SALESFORCE_ORDER_ID]: input.replacesSalesforceOrderId }
      : {}),
    ...(input.replacesMedusaOrderId
      ? { [ORDER_REPLACES_ORDER_ID]: input.replacesMedusaOrderId }
      : {}),
  }
}

export function buildHiddenFromAccountMetadata(input: {
  replacedBySalesforceOrderId: string
  replacedByMedusaOrderId: string
}): Record<string, unknown> {
  return {
    [ORDER_HIDDEN_FROM_ACCOUNT]: true,
    [ORDER_REPLACED_BY_SALESFORCE_ORDER_ID]: input.replacedBySalesforceOrderId,
    [ORDER_REPLACED_BY_MEDUSA_ORDER_ID]: input.replacedByMedusaOrderId,
  }
}
