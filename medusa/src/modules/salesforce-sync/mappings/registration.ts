import { centsToMajorEur } from "../utils/money"
import { REGISTRATION_EXTERNAL_ID_FIELD } from "../utils/salesforce-config"

export type SfRegistrationShape = {
  Id?: string
  Medusa_Registration_Id__c?: string
  Order__c?: string
  Account__c?: string
  Contact_Lookup__c?: string
  vaProduct__c?: string
  Status__c?: string
  Origin__c?: string
  WebOrder__c?: boolean
  Number_Of_People__c?: number
  Total_Price__c?: number
  Order_Amount__c?: number
  Total_Net_Price__c?: number
  Product_Start_Date__c?: string | null
  Product_End_Date__c?: string | null
  Product_Code__c?: string | null
  Product_City__c?: string | null
  Billing_Street__c?: string | null
  Billing_City__c?: string | null
  Billing_PostalCode__c?: string | null
  Billing_Country__c?: string | null
  Total_Quantity__c?: number
}

export type RegistrationLineContext = {
  externalId: string
  orderId: string
  accountId: string
  contactId: string
  vaProductId: string
  lineTotalCents: number
  orderTotalCents: number
  productStartAt?: string | null
  productEndAt?: string | null
  productCode?: string | null
  productCity?: string | null
  billingStreet?: string | null
  billingCity?: string | null
  billingPostalCode?: string | null
  billingCountry?: string | null
}

export function registrationToSalesforce(input: RegistrationLineContext): Partial<SfRegistrationShape> {
  return {
    Medusa_Registration_Id__c: input.externalId,
    Order__c: input.orderId,
    Account__c: input.accountId,
    Contact_Lookup__c: input.contactId,
    vaProduct__c: input.vaProductId,
    Status__c: "Ingeschreven",
    Origin__c: "Website",
    WebOrder__c: true,
    Number_Of_People__c: 1,
    Total_Price__c: centsToMajorEur(input.lineTotalCents),
    Order_Amount__c: centsToMajorEur(input.orderTotalCents),
    Total_Quantity__c: 1,
    Product_Start_Date__c: input.productStartAt ?? undefined,
    Product_End_Date__c: input.productEndAt ?? undefined,
    Product_Code__c: input.productCode ?? undefined,
    Product_City__c: input.productCity ?? undefined,
    Billing_Street__c: input.billingStreet ?? undefined,
    Billing_City__c: input.billingCity ?? undefined,
    Billing_PostalCode__c: input.billingPostalCode ?? undefined,
    Billing_Country__c: input.billingCountry ?? undefined,
  }
}

export const registrationExternalIdField = REGISTRATION_EXTERNAL_ID_FIELD
export const SF_REGISTRATION_OBJECT = "Registration__c"

export type SfVoucherShape = {
  Id?: string
  Medusa_Gift_Card_Id__c?: string
  Source_Order__c?: string
  Type__c?: string
  Original_Amount__c?: number
  Beneficiary_Name__c?: string
  Beneficiary_Email__c?: string
  Code__c?: string
  Sync_with_Heroku__c?: boolean
}

export function voucherPurchaseToSalesforce(input: {
  giftCardId: string
  orderId: string
  amountCents: number
  recipientName: string
  recipientEmail: string
  code: string
}): Partial<SfVoucherShape> {
  return {
    Medusa_Gift_Card_Id__c: input.giftCardId,
    Source_Order__c: input.orderId,
    Type__c: "Giftcard",
    Original_Amount__c: centsToMajorEur(input.amountCents),
    Beneficiary_Name__c: input.recipientName,
    Beneficiary_Email__c: input.recipientEmail,
    Code__c: input.code.replace(/^GIFT-/i, ""),
    Sync_with_Heroku__c: false,
  }
}
