import { customerMapping } from "./customer"
import { courseProductSalesforceFieldsForPull, SF_COURSE_PRODUCT_OBJECT } from "./course-product"
import { orderMapping } from "./order"
import { orderItemExternalIdField, SF_ORDER_ITEM_OBJECT } from "./order-item"
import { productMapping } from "./product"
import {
  productgroupSalesforceFieldsForPull,
  SF_PRODUCTGROUP_OBJECT,
} from "./productgroup"
import {
  registrationExternalIdField,
  SF_REGISTRATION_OBJECT,
} from "./registration"
import type { EntityMapping } from "./types"
import { variantMapping } from "./variant"

export {
  customerMapping,
  courseProductSalesforceFieldsForPull,
  orderMapping,
  orderItemExternalIdField,
  productMapping,
  productgroupSalesforceFieldsForPull,
  registrationExternalIdField,
  SF_COURSE_PRODUCT_OBJECT,
  SF_ORDER_ITEM_OBJECT,
  SF_PRODUCTGROUP_OBJECT,
  SF_REGISTRATION_OBJECT,
  variantMapping,
}
export type * from "./types"

/** Resolve Salesforce object from webhook `object_type` (API name). */
export function entityTypeFromSalesforceObject(objectType: string): string | null {
  const t = objectType.trim()
  if (t === "Contact") return "customer"
  if (t === "Account") return "account"
  if (t === "Order") return "order"
  if (t === "OrderItem") return "order_item"
  if (t === "Registration__c") return "registration"
  if (t === "Voucher__c") return "voucher"
  if (t === "Product2") return "product"
  if (t === SF_PRODUCTGROUP_OBJECT) return "productgroup"
  if (t === SF_COURSE_PRODUCT_OBJECT) return "course_product"
  return null
}

export function salesforceObjectForEntity(
  e: EntityMapping["medusaEntity"] | "productgroup" | "course_product",
  variantAsProduct2 = true
): string {
  if (e === "customer") return "Contact"
  if (e === "order") return "Order"
  if (e === "productgroup") return SF_PRODUCTGROUP_OBJECT
  if (e === "course_product") return SF_COURSE_PRODUCT_OBJECT
  if (e === "product") return "Product2"
  return variantAsProduct2 ? "Product2" : "Product2"
}
