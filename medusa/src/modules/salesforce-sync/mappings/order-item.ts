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
  Is_Discount__c?: boolean
  Is_Voucher__c?: boolean
  Product_Name__c?: string
  Product__c?: string
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

export function productOrderItemFields(input: ProductLineInput): Partial<SfOrderItemShape> {
  const useMedusaFields = usesSalesforceMedusaCustomFields()
  const core: Partial<SfOrderItemShape> = {
    ...(useMedusaFields ? { Medusa_Order_Item_Id__c: input.externalId } : {}),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Product2Id: input.product2Id,
    Quantity: 1,
    UnitPrice: centsToMajorEur(input.unitPriceCents),
    vaProduct__c: input.vaProductId,
    Registration__c: input.registrationId,
  }
  if (!useMedusaFields) return core

  return {
    ...core,
    Is_Discount__c: false,
    Is_Voucher__c: false,
    Product_Name__c: input.productLabel,
    Product__c: input.productLabel,
  }
}

export function discountOrderItemFields(input: DiscountLineInput): Partial<SfOrderItemShape> {
  const useMedusaFields = usesSalesforceMedusaCustomFields()
  const core: Partial<SfOrderItemShape> = {
    ...(useMedusaFields ? { Medusa_Order_Item_Id__c: input.externalId } : {}),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Product2Id: input.product2Id,
    Quantity: 1,
    UnitPrice: -centsToMajorEur(input.discountCents),
    Registration__c: input.registrationId,
  }
  if (!useMedusaFields) return core

  return {
    ...core,
    Is_Discount__c: true,
    Is_Voucher__c: false,
    Product_Name__c: "Korting",
    Product__c: "Korting",
    Discount_Code__c: input.promotionCode ?? undefined,
  }
}

export function giftCardPurchaseOrderItemFields(
  input: GiftCardPurchaseLineInput
): Partial<SfOrderItemShape> {
  return {
    ...(usesSalesforceMedusaCustomFields()
      ? { Medusa_Order_Item_Id__c: input.externalId }
      : {}),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Product2Id: input.product2Id,
    Quantity: 1,
    UnitPrice: centsToMajorEur(input.amountCents),
    Is_Discount__c: false,
    Is_Voucher__c: true,
    Giftcard_Type__c: "Giftcard",
    Giftcard_Beneficiary_Name__c: input.recipientName,
    Giftcard_Beneficiary_Email__c: input.recipientEmail,
    Product_Name__c: "Cadeaubon",
    Product__c: "Cadeaubon",
  }
}

export function voucherRedemptionOrderItemFields(
  input: VoucherRedemptionLineInput
): Partial<SfOrderItemShape> {
  return {
    ...(usesSalesforceMedusaCustomFields()
      ? { Medusa_Order_Item_Id__c: input.externalId }
      : {}),
    OrderId: input.orderId,
    PricebookEntryId: input.pricebookEntryId,
    Product2Id: input.product2Id,
    Quantity: 1,
    UnitPrice: -centsToMajorEur(input.amountCents),
    Is_Discount__c: false,
    Is_Voucher__c: true,
    Voucher__c: input.voucherId,
    Product_Name__c: "Voucher",
    Product__c: "Voucher",
    Discount_Code__c: input.giftCardCode ?? undefined,
  }
}

export const orderItemExternalIdField = ORDER_ITEM_EXTERNAL_ID_FIELD

export const SF_ORDER_ITEM_OBJECT = "OrderItem"
