import type { FieldMap } from "./types"

export type SfOrderShape = {
  Id?: string
  Medusa_Order_Id__c?: string
  Medusa_Order_Display_Id__c?: string
  Medusa_Order_Email__c?: string
  Medusa_Order_Status__c?: string
  Medusa_Order_Total_Cents__c?: number
  Description?: string
}

export type MedusaOrderShape = {
  id: string
  display_id?: number | null
  email?: string | null
  status?: string | null
  total?: number | { numeric?: number; value?: number }
  currency_code?: string | null
}

export const orderMapping: FieldMap<MedusaOrderShape, SfOrderShape> = {
  externalIdField: "Medusa_Order_Id__c",
  salesforceFieldsForPull: [
    "Id",
    "Medusa_Order_Id__c",
    "Medusa_Order_Display_Id__c",
    "Medusa_Order_Email__c",
    "Medusa_Order_Status__c",
    "Medusa_Order_Total_Cents__c",
    "Description",
  ],
  toSalesforce: (o) => {
    const total =
      typeof o.total === "number"
        ? o.total
        : typeof o.total === "object" && o.total !== null
          ? (o.total.numeric ?? o.total.value ?? 0)
          : 0
    return {
      Medusa_Order_Id__c: o.id,
      Medusa_Order_Display_Id__c: o.display_id != null ? String(o.display_id) : undefined,
      Medusa_Order_Email__c: o.email ?? undefined,
      Medusa_Order_Status__c: o.status ?? undefined,
      Medusa_Order_Total_Cents__c: Math.round(total),
      Description: o.currency_code ? `currency:${o.currency_code}` : undefined,
    }
  },
  fromSalesforce: (sf) => ({
    email: sf.Medusa_Order_Email__c ?? undefined,
    status: sf.Medusa_Order_Status__c ?? undefined,
  }),
}
