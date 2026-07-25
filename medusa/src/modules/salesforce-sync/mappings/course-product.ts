import type { DeliveryType } from "../../events/types"
import { isVathuisRecordType } from "../clients/audience-player"
import { VATHUIS_UNLIMITED_AVAILABILITY } from "../../../lib/vathuis-availability"

/** Salesforce `vaProduct__c` (child occurrence under a product group). */
export type SfCourseProductShape = {
  Id?: string
  Name?: string
  Productgroup__c?: string | null
  Price__c?: number | null
  Net_Price__c?: number | null
  VAT__c?: string | null
  Start_date_time__c?: string | null
  End_date_time__c?: string | null
  Product_City__c?: string | null
  Product_Location_Name__c?: string | null
  Maximum_capacity__c?: number | null
  Capacity__c?: number | null
  Availability_capacity__c?: string | null
  Free_Product__c?: boolean | null
  Audience_Player_Article_Id__c?: number | null
  Audience_Player_Product_Id__c?: number | null
  Account_Teacher__c?: string | null
  Main_Teacher_Name__c?: string | null
  Account_Teacher__r?: { Id?: string; Name?: string } | null
}

export const SF_COURSE_PRODUCT_OBJECT = "vaProduct__c"

export const courseProductSalesforceFieldsForPull = [
  "Id",
  "Name",
  "Productgroup__c",
  "Price__c",
  "Net_Price__c",
  "VAT__c",
  "Start_date_time__c",
  "End_date_time__c",
  "Product_City__c",
  "Product_Location_Name__c",
  "Maximum_capacity__c",
  "Capacity__c",
  "Availability_capacity__c",
  "Free_Product__c",
  "Audience_Player_Article_Id__c",
  "Audience_Player_Product_Id__c",
  "Account_Teacher__c",
  "Account_Teacher__r.Name",
  "Main_Teacher_Name__c",
] as const

/** Gross price in EUR (Medusa v2 major currency units, e.g. 19.5). */
export function courseProductPriceAmount(sf: SfCourseProductShape): number {
  return Number(sf.Price__c ?? 0)
}

export function isOnlineCityLabel(city: string | null | undefined): boolean {
  return (city ?? "").trim().toLowerCase() === "online"
}

export function inferDeliveryType(
  sf: SfCourseProductShape,
  groupRecordType?: string | null
): DeliveryType {
  if (isVathuisRecordType(groupRecordType) || sf.Audience_Player_Article_Id__c) {
    return "pre_recorded"
  }
  const city = sf.Product_City__c?.trim()
  if (!city) return "online"
  if (isOnlineCityLabel(city)) return "online"
  return "offline"
}

export function courseProductAvailableQuantity(
  sf: SfCourseProductShape,
  groupRecordType?: string | null
): number {
  if (isVathuisRecordType(groupRecordType) || sf.Audience_Player_Article_Id__c) {
    return VATHUIS_UNLIMITED_AVAILABILITY
  }
  const max = sf.Maximum_capacity__c ?? sf.Capacity__c
  if (typeof max === "number" && max > 0) return max
  const availability = (sf.Availability_capacity__c ?? "").toLowerCase()
  if (availability.includes("full") || availability.includes("vol")) return 0
  return 100
}

export function courseProductOptionLabel(sf: SfCourseProductShape): string {
  const start = sf.Start_date_time__c
    ? new Date(sf.Start_date_time__c).toISOString().slice(0, 16).replace("T", " ")
    : "Sessie"
  const city = sf.Product_City__c?.trim() || "Online"
  const base = `${start} — ${city}`
  return sf.Id ? `${base} [${sf.Id.slice(-6)}]` : base
}

export function courseProductVariantTitle(sf: SfCourseProductShape): string {
  return sf.Name?.trim() || courseProductOptionLabel(sf)
}
