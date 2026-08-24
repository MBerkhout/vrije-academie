import { centsToMajorEur } from "../utils/money"
import { REGISTRATION_EXTERNAL_ID_FIELD } from "../utils/salesforce-config"
import { usesSalesforceMedusaCustomFields } from "../utils/salesforce-medusa-fields"

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
  Amount__c?: number
  Unit_Price__c?: number
  Total_Net_Price__c?: number
  EmailParticipant__c?: string | null
  Order_Item__c?: string
  Total_Quantity__c?: number
}

export type RegistrationLineContext = {
  externalId: string
  orderId: string
  accountId: string
  contactId: string
  vaProductId: string
  lineTotalCents: number
  unitPriceCents: number
  participantEmail?: string | null
}

export function registrationToSalesforce(input: RegistrationLineContext): Partial<SfRegistrationShape> {
  const price = centsToMajorEur(input.lineTotalCents)
  const unit = centsToMajorEur(input.unitPriceCents)
  return {
    ...(usesSalesforceMedusaCustomFields()
      ? { Medusa_Registration_Id__c: input.externalId }
      : {}),
    Order__c: input.orderId,
    Account__c: input.accountId,
    Contact_Lookup__c: input.contactId,
    vaProduct__c: input.vaProductId,
    Status__c: "Ingeschreven",
    WebOrder__c: true,
    Number_Of_People__c: 1,
    Total_Price__c: price,
    Amount__c: price,
    Unit_Price__c: unit,
    Total_Net_Price__c: price,
    Total_Quantity__c: 1,
    EmailParticipant__c: input.participantEmail ?? undefined,
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
    ...(usesSalesforceMedusaCustomFields()
      ? { Medusa_Gift_Card_Id__c: input.giftCardId }
      : {}),
    Source_Order__c: input.orderId,
    Type__c: "Giftcard",
    Original_Amount__c: centsToMajorEur(input.amountCents),
    Beneficiary_Name__c: input.recipientName,
    Beneficiary_Email__c: input.recipientEmail,
    Code__c: input.code.replace(/^GIFT-/i, ""),
    Sync_with_Heroku__c: false,
  }
}
