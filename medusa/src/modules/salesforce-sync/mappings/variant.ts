import type { FieldMap } from "./types"
import { usesSalesforceMedusaCustomFields } from "../utils/salesforce-medusa-fields"

export type SfVariantProduct2Shape = {
  Id?: string
  Medusa_Variant_Id__c?: string
  Medusa_Product_Group_Id__c?: string
  Name?: string
  StockKeepingUnit?: string | null
  IsActive?: boolean
}

export type MedusaVariantShape = {
  id: string
  title?: string | null
  sku?: string | null
  product_id?: string | null
}

export const variantMapping: FieldMap<MedusaVariantShape, SfVariantProduct2Shape> = {
  externalIdField: "Medusa_Variant_Id__c",
  salesforceFieldsForPull: [
    "Id",
    "Medusa_Variant_Id__c",
    "Medusa_Product_Group_Id__c",
    "Name",
    "StockKeepingUnit",
    "IsActive",
  ],
  toSalesforce: (v) => ({
    ...(usesSalesforceMedusaCustomFields()
      ? {
          Medusa_Variant_Id__c: v.id,
          Medusa_Product_Group_Id__c: v.product_id ?? undefined,
        }
      : {}),
    Name: v.title ?? v.sku ?? v.id,
    StockKeepingUnit: v.sku ?? undefined,
    IsActive: true,
  }),
  fromSalesforce: () => ({}),
}
