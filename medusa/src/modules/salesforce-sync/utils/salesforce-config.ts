/** Default VA pricebook (from live website orders). Override via env. */
export const SALESFORCE_DEFAULT_PRICEBOOK2_ID =
  process.env.SALESFORCE_DEFAULT_PRICEBOOK2_ID?.trim() || "01s1t000002j19kAAA"

/** Generic Korting product on OrderItem discount lines. */
export const SALESFORCE_DISCOUNT_PRODUCT2_ID =
  process.env.SALESFORCE_DISCOUNT_PRODUCT2_ID?.trim() || "01t1t000001j7i9AAA"

/** Cadeaubon / voucher purchase product. */
export const SALESFORCE_GIFTCARD_PRODUCT2_ID =
  process.env.SALESFORCE_GIFTCARD_PRODUCT2_ID?.trim() || ""

export const SF_ORDER_OBJECT = "Order"
export const SF_ORDER_ITEM_OBJECT = "OrderItem"
export const SF_REGISTRATION_OBJECT = "Registration__c"
export const SF_VOUCHER_OBJECT = "Voucher__c"

export const ORDER_EXTERNAL_ID_FIELD = "Medusa_Order_Id__c"
export const ORDER_ITEM_EXTERNAL_ID_FIELD = "Medusa_Order_Item_Id__c"
export const REGISTRATION_EXTERNAL_ID_FIELD = "Medusa_Registration_Id__c"
export const VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD = "Medusa_Gift_Card_Id__c"

export { usesSalesforceMedusaCustomFields } from "./salesforce-medusa-fields"
