import { centsToMajorEur } from "../utils/money"
import {
  ORDER_EXTERNAL_ID_FIELD,
  SALESFORCE_DEFAULT_PRICEBOOK2_ID,
} from "../utils/salesforce-config"
import type { FieldMap } from "./types"

export type SfOrderShape = {
  Id?: string
  Medusa_Order_Id__c?: string
  Medusa_Order_Display_Id__c?: string
  Medusa_Order_Email__c?: string
  Medusa_Order_Status__c?: string
  Medusa_Order_Total_Cents__c?: number
  Description?: string
  AccountId?: string
  BillToContactId?: string
  ShipToContactId?: string
  EffectiveDate?: string
  Status?: string
  Website_Order__c?: boolean
  Order_Origin__c?: string
  Type?: string
  TotalAmount?: number
  Payment_Method__c?: string
  Ideal_Transaction_Id__c?: string
  Pricebook2Id?: string
  BillingStreet?: string
  BillingCity?: string
  BillingPostalCode?: string
  BillingCountry?: string
  ShippingStreet?: string
  ShippingCity?: string
  ShippingPostalCode?: string
  ShippingCountry?: string
  Sync_With_Heroku__c?: boolean
}

export type MedusaOrderAddressShape = {
  address_1?: string | null
  city?: string | null
  postal_code?: string | null
  country_code?: string | null
}

export type MedusaOrderPushShape = {
  id: string
  display_id?: number | null
  email?: string | null
  status?: string | null
  total_cents?: number
  currency_code?: string | null
  effective_date?: string
  account_id?: string | null
  contact_id?: string | null
  payment_method?: string | null
  mollie_transaction_id?: string | null
  billing_address?: MedusaOrderAddressShape | null
  shipping_address?: MedusaOrderAddressShape | null
  pricebook2_id?: string | null
  /** When true, omit Status so SF keeps Activated on update. */
  for_update?: boolean
}

function formatSfDate(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10)
  const d = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10)
}

function countryLabel(code: string | null | undefined): string | undefined {
  if (!code) return undefined
  const c = code.trim().toUpperCase()
  if (c === "NL") return "Netherlands"
  if (c === "BE") return "Belgium"
  if (c === "DE") return "Germany"
  return code
}

function addressFields(addr: MedusaOrderAddressShape | null | undefined, prefix: "Billing" | "Shipping") {
  if (!addr) return {}
  return {
    [`${prefix}Street`]: addr.address_1 ?? undefined,
    [`${prefix}City`]: addr.city ?? undefined,
    [`${prefix}PostalCode`]: addr.postal_code ?? undefined,
    [`${prefix}Country`]: countryLabel(addr.country_code),
  }
}

export function orderHeaderToSalesforce(o: MedusaOrderPushShape): Partial<SfOrderShape> {
  const totalCents = o.total_cents ?? 0
  return {
    Medusa_Order_Id__c: o.id,
    Medusa_Order_Display_Id__c: o.display_id != null ? String(o.display_id) : undefined,
    Medusa_Order_Email__c: o.email ?? undefined,
    Medusa_Order_Status__c: o.status ?? undefined,
    Medusa_Order_Total_Cents__c: Math.round(totalCents),
    Description: o.currency_code ? `currency:${o.currency_code}` : undefined,
    AccountId: o.account_id ?? undefined,
    BillToContactId: o.contact_id ?? undefined,
    ShipToContactId: o.contact_id ?? undefined,
    EffectiveDate: formatSfDate(o.effective_date),
    ...(o.for_update ? {} : { Status: "Draft" }),
    Website_Order__c: true,
    Order_Origin__c: "Website",
    Type: "Aankoop",
    TotalAmount: centsToMajorEur(totalCents),
    Payment_Method__c: o.payment_method ?? undefined,
    Ideal_Transaction_Id__c: o.mollie_transaction_id ?? undefined,
    Pricebook2Id: o.pricebook2_id ?? SALESFORCE_DEFAULT_PRICEBOOK2_ID,
    Sync_With_Heroku__c: false,
    ...addressFields(o.billing_address, "Billing"),
    ...addressFields(o.shipping_address, "Shipping"),
  }
}

export const orderMapping: FieldMap<MedusaOrderPushShape, SfOrderShape> = {
  externalIdField: ORDER_EXTERNAL_ID_FIELD,
  salesforceFieldsForPull: [
    "Id",
    ORDER_EXTERNAL_ID_FIELD,
    "Medusa_Order_Display_Id__c",
    "Medusa_Order_Email__c",
    "Medusa_Order_Status__c",
    "Medusa_Order_Total_Cents__c",
    "Description",
  ],
  toSalesforce: orderHeaderToSalesforce,
  fromSalesforce: (sf) => ({
    email: sf.Medusa_Order_Email__c ?? undefined,
    status: sf.Medusa_Order_Status__c ?? undefined,
  }),
}

/** @deprecated use MedusaOrderPushShape */
export type MedusaOrderShape = MedusaOrderPushShape
