import { centsToMajorEur } from "../utils/money"
import { ORDER_ITEM_EXTERNAL_ID_FIELD } from "../utils/salesforce-config"
import { usesSalesforceMedusaCustomFields } from "../utils/salesforce-medusa-fields"

export type SfOrderItemShape = {
  Id?: string
  Medusa_Order_Item_Id__c?: string
  OrderId?: string
  PricebookEntryId?: string
  Product2Id?: string
  Quantity?: number
  UnitPrice?: number
  vaProduct__c?: string
  Registration__c?: string
  /** Writable name shown on Orderproducten (`Product_Name__c` is a formula). */
  ProductName__c?: string
  Discount_Code__c?: string
  Giftcard_Type__c?: string
  Giftcard_Beneficiary_Name__c?: string
  Giftcard_Beneficiary_Email__c?: string
  Voucher__c?: string
}

export type ProductLineInput = {
  externalId: string
  orderId: string
  pricebookEntryId: string
  product2Id: string
  vaProductId: string
  unitPriceCents: number
  registrationId: string
  productLabel: string
}

export type DiscountLineInput = {
  externalId: string
  orderId: string
  pricebookEntryId: string
  product2Id: string
  discountCents: number
  registrationId: string
  promotionCode?: string | null
}

export type GiftCardPurchaseLineInput = {
  externalId: string
  orderId: string
  pricebookEntryId: string
  product2Id: string
  amountCents: number
  recipientName: string
  recipientEmail: string
  message?: string | null
}

export type VoucherRedemptionLineInput = {
  externalId: string
  orderId: string
  pricebookEntryId: string
  product2Id: string
  amountCents: number
  voucherId: string
  giftCardCode?: string | null
}

function medusaOrderItemId(externalId: string): Partial<SfOrderItemShape> {
  return usesSalesforceMedusaCustomFields()
    ? { Medusa_Order_Item_Id__c: externalId }
    : {}
}

export function productOrderItemFields(input: ProductLineInput): Partial<SfOrderItemShape> {
  return {
    ...medusaOrderItemId(input.externalId),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Quantity: 1,
    UnitPrice: centsToMajorEur(input.unitPriceCents),
    vaProduct__c: input.vaProductId,
    Registration__c: input.registrationId,
    ProductName__c: input.productLabel,
  }
}

export function discountOrderItemFields(input: DiscountLineInput): Partial<SfOrderItemShape> {
  return {
    ...medusaOrderItemId(input.externalId),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Quantity: 1,
    UnitPrice: -centsToMajorEur(input.discountCents),
    Registration__c: input.registrationId,
    ProductName__c: "Korting",
    Discount_Code__c: input.promotionCode ?? undefined,
  }
}

export function giftCardPurchaseOrderItemFields(
  input: GiftCardPurchaseLineInput
): Partial<SfOrderItemShape> {
  return {
    ...medusaOrderItemId(input.externalId),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Quantity: 1,
    UnitPrice: centsToMajorEur(input.amountCents),
    Giftcard_Type__c: "Giftcard",
    Giftcard_Beneficiary_Name__c: input.recipientName,
    Giftcard_Beneficiary_Email__c: input.recipientEmail,
    ProductName__c: "Cadeaubon",
  }
}

export function voucherRedemptionOrderItemFields(
  input: VoucherRedemptionLineInput
): Partial<SfOrderItemShape> {
  return {
    ...medusaOrderItemId(input.externalId),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Quantity: 1,
    UnitPrice: -centsToMajorEur(input.amountCents),
    Voucher__c: input.voucherId,
    ProductName__c: "Voucher",
    Discount_Code__c: input.giftCardCode ?? undefined,
  }
}

export const orderItemExternalIdField = ORDER_ITEM_EXTERNAL_ID_FIELD

export const SF_ORDER_ITEM_OBJECT = "OrderItem"
