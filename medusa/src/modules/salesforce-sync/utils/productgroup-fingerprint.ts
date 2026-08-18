import type { SfCourseProductShape } from "../mappings/course-product"
import type { SfProductgroupShape } from "../mappings/productgroup"
import { stableStringify } from "./deep-equal"

/** Bump when Medusa-side session facet mapping changes (forces re-import / invalidates skip-unchanged). */
export const MEDUSA_FACET_SYNC_VERSION = 1

const GROUP_FINGERPRINT_KEYS = [
  "Name",
  "Productgroup_URL__c",
  "Productgroup_Price__c",
  "Productgroup_Description__c",
  "Productgroup_Subtitle__c",
  "Productgroup_Web_Body__c",
  "Productgroup_Web_Trigger__c",
  "Productgroup_Subject__c",
  "Subject_Text__c",
  "Productgroup_Record_Type_Developer_Name__c",
  "SEO_Title__c",
  "SEO_Meta_Description__c",
  "Primary_1_Url__c",
  "Image_1_Url__c",
  "Image_2_Url__c",
  "Image_3_Url__c",
  "Image_4_Url__c",
  "Image_1_Source__c",
  "Image_2_Source__c",
  "Image_3_Source__c",
  "Image_4_Source__c",
  "Latest_Product_Start_Date__c",
  "Highlighted_Teacher__c",
  "Highlighted_Teacher_Teaser__c",
  "Highlighted_Teacher_Image__c",
  "External_Registration_URL__c",
  "Linked_Online_Productgroup__c",
  "CTA_Label__c",
  "CTA_Color__c",
  "CTA_Color_Hover__c",
  "Order__c",
] as const

const CHILD_FINGERPRINT_KEYS = [
  "Id",
  "Price__c",
  "Start_date_time__c",
  "End_date_time__c",
  "Product_City__c",
  "Product_Location_Name__c",
  "Product_Location__c",
  "Product_Location_Room__c",
  "Product_Location_Room_Name__c",
  "Account__c",
  "Capacity__c",
  "Maximum_capacity__c",
  "Availability_capacity__c",
  "Free_Product__c",
  "Account_Teacher__c",
  "Main_Teacher_Name__c",
  "Audience_Player_Article_Id__c",
] as const

function pickKeys<T extends Record<string, unknown>>(row: T, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    out[key] = row[key]
  }
  return out
}

/** Stable hash of Salesforce group + child rows for skip-if-unchanged bulk import. */
export function productgroupImportFingerprint(
  group: SfProductgroupShape,
  children: SfCourseProductShape[]
): string {
  const payload = {
    medusa_facet_sync_version: MEDUSA_FACET_SYNC_VERSION,
    group: pickKeys(group as Record<string, unknown>, GROUP_FINGERPRINT_KEYS),
    children: children
      .filter((c) => c.Id)
      .map((c) => pickKeys(c as Record<string, unknown>, CHILD_FINGERPRINT_KEYS))
      .sort((a, b) => String(a.Id).localeCompare(String(b.Id))),
  }
  return stableStringify(payload)
}
