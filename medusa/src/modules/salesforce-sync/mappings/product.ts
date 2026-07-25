import type { FieldMap } from "./types"
import { usesSalesforceMedusaCustomFields } from "../utils/salesforce-medusa-fields"

export type SfProduct2Shape = {
  Id?: string
  Medusa_Product_Id__c?: string
  Name?: string
  Description?: string | null
  StockKeepingUnit?: string | null
  IsActive?: boolean
}

export type MedusaProductShape = {
  id: string
  title?: string | null
  handle?: string | null
  description?: string | null
}

export const productMapping: FieldMap<MedusaProductShape, SfProduct2Shape> = {
  externalIdField: "Medusa_Product_Id__c",
  salesforceFieldsForPull: [
    "Id",
    "Name",
    "Description",
    "StockKeepingUnit",
  ],
  toSalesforce: (p) => ({
    ...(usesSalesforceMedusaCustomFields() ? { Medusa_Product_Id__c: p.id } : {}),
    Name: p.title ?? p.handle ?? p.id,
    Description: p.description ?? undefined,
    StockKeepingUnit: p.handle ?? undefined,
    IsActive: true,
  }),
  fromSalesforce: (sf) => ({
    title: sf.Name ?? undefined,
    description: sf.Description ?? undefined,
    handle: sf.StockKeepingUnit ?? undefined,
  }),
}
