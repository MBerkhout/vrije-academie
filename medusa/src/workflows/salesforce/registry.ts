import {
  pullCustomerFromSalesforceWorkflowId,
} from "./pull-customer-salesforce"
import { pullOrderFromSalesforceWorkflowId } from "./pull-order-salesforce"
import { pullProductFromSalesforceWorkflowId } from "./pull-product-salesforce"
import { pullProductgroupFromSalesforceWorkflowId } from "./pull-productgroup-salesforce"
import { pullDocentFromSalesforceWorkflowId } from "./pull-docent-salesforce"
import {
  pushCustomerToSalesforceWorkflowId,
} from "./push-customer-salesforce"
import { pushOrderToSalesforceWorkflowId } from "./push-order-salesforce"
import { pushProductToSalesforceWorkflowId } from "./push-product-salesforce"
import { pushVariantToSalesforceWorkflowId } from "./push-variant-salesforce"

export function pullWorkflowIdForEntity(
  entityType: string
): string | null {
  switch (entityType) {
    case "customer":
      return pullCustomerFromSalesforceWorkflowId
    case "order":
      return pullOrderFromSalesforceWorkflowId
    case "product":
      return pullProductFromSalesforceWorkflowId
    case "productgroup":
      return pullProductgroupFromSalesforceWorkflowId
    case "docent":
      return pullDocentFromSalesforceWorkflowId
    default:
      return null
  }
}

export function pushWorkflowIdForEntity(entityType: string): string | null {
  switch (entityType) {
    case "customer":
      return pushCustomerToSalesforceWorkflowId
    case "order":
      return pushOrderToSalesforceWorkflowId
    case "product":
      return pushProductToSalesforceWorkflowId
    case "variant":
      return pushVariantToSalesforceWorkflowId
    default:
      return null
  }
}
