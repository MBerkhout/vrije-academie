import type { RecordType } from "../../events/types"

/** Salesforce `vaProductgroup__c` */
export type SfProductgroupShape = {
  Id?: string
  Name?: string
  Productgroup_URL__c?: string | null
  Productgroup_Price__c?: number | null
  Net_Price__c?: number | null
  Productgroup_Description__c?: string | null
  Productgroup_Subtitle__c?: string | null
  Productgroup_Web_Body__c?: string | null
  Productgroup_Web_Trigger__c?: string | null
  Productgroup_Subject__c?: string | null
  Subject_Text__c?: string | null
  Productgroup_Record_Type_Developer_Name__c?: string | null
  SEO_Title__c?: string | null
  SEO_Meta_Description__c?: string | null
  Primary_1_Url__c?: string | null
  Image_1_Url__c?: string | null
  Image_2_Url__c?: string | null
  Image_3_Url__c?: string | null
  Image_4_Url__c?: string | null
  VAT_Rate__c?: string | null
  Latest_Product_Start_Date__c?: string | null
  Free_Product__c?: boolean | null
  Audience_Player_Episodes__c?: string | null
  Audience_Player_Play_Time__c?: string | null
  Highlighted_Teacher__c?: string | null
  Highlighted_Teacher_Teaser__c?: string | null
  Highlighted_Teacher_Image__c?: string | null
  Audience_Preview_Url__c?: string | null
  IFrame_URL_1__c?: string | null
  Samenvatting__c?: string | null
  External_Registration_URL__c?: string | null
  Linked_Online_Productgroup__c?: string | null
  CTA_Label__c?: string | null
  CTA_Color__c?: string | null
  CTA_Color_Hover__c?: string | null
  /** Editorial catalog sort order (PLP default). */
  Order__c?: number | null
}

export const SF_PRODUCTGROUP_OBJECT = "vaProductgroup__c"

export const productgroupSalesforceFieldsForPull = [
  "Id",
  "Name",
  "Productgroup_URL__c",
  "Productgroup_Price__c",
  "Net_Price__c",
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
  "VAT_Rate__c",
  "Latest_Product_Start_Date__c",
  "Free_Product__c",
  "Audience_Player_Episodes__c",
  "Audience_Player_Play_Time__c",
  "Highlighted_Teacher__c",
  "Highlighted_Teacher__r.Name",
  "Highlighted_Teacher_Teaser__c",
  "Highlighted_Teacher_Image__c",
  "Audience_Preview_Url__c",
  "IFrame_URL_1__c",
  "Samenvatting__c",
  "External_Registration_URL__c",
  "Linked_Online_Productgroup__c",
  "CTA_Label__c",
  "CTA_Color__c",
  "CTA_Color_Hover__c",
  "Order__c",
] as const

export function parseProductgroupSubjects(sf: SfProductgroupShape): string[] {
  const raw = sf.Productgroup_Subject__c ?? sf.Subject_Text__c ?? ""
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function mapSalesforceRecordType(
  developerName: string | null | undefined
): RecordType {
  const d = (developerName ?? "").trim().toLowerCase()
  if (d === "collegereeks") return "collegereeks"
  if (d === "lezing") return "lezing"
  if (d === "excursie") return "excursie"
  if (d === "studiedag") return "studiedag"
  if (d === "lezingen_thuis" || d === "thuis_college") return "vathuis"
  return "lezing"
}

/** Medusa `product_type.value` from Salesforce record type developer name. */
export function productTypeValueFromSalesforce(
  developerName: string | null | undefined
): string {
  const raw = (developerName ?? "").trim()
  if (!raw) return "Lezing"
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

export function productgroupGalleryUrls(sf: SfProductgroupShape): string[] {
  return [
    sf.Image_1_Url__c,
    sf.Image_2_Url__c,
    sf.Image_3_Url__c,
    sf.Image_4_Url__c,
  ].filter((u): u is string => !!u?.trim())
}

export function productgroupMetadataFromSalesforce(
  sf: SfProductgroupShape,
  vatRateLabel?: string | null,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return {
    salesforce_productgroup_id: sf.Id ?? null,
    salesforce_seo_title: sf.SEO_Title__c ?? null,
    salesforce_seo_description: sf.SEO_Meta_Description__c ?? null,
    salesforce_web_body: sf.Productgroup_Web_Body__c ?? null,
    salesforce_web_trigger: sf.Productgroup_Web_Trigger__c ?? null,
    salesforce_description_html: sf.Productgroup_Description__c ?? null,
    salesforce_subtitle: sf.Productgroup_Subtitle__c ?? null,
    salesforce_vat_rate: vatRateLabel ?? null,
    salesforce_group_price: sf.Productgroup_Price__c ?? null,
    salesforce_external_registration_url: sf.External_Registration_URL__c?.trim() || null,
    salesforce_linked_online_productgroup_id:
      sf.Linked_Online_Productgroup__c?.trim() || null,
    salesforce_cta_label: sf.CTA_Label__c?.trim() || null,
    salesforce_cta_color: sf.CTA_Color__c?.trim() || null,
    salesforce_cta_color_hover: sf.CTA_Color_Hover__c?.trim() || null,
    salesforce_order: sf.Order__c ?? null,
    ...extra,
  }
}

/** Normalize Salesforce slug to a Medusa-safe product handle. */
export function sanitizeProductHandle(raw: string | null | undefined, fallback: string): string {
  const base = (raw?.trim() || fallback).toLowerCase()
  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || fallback.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

export function stripHtmlToPlainText(html: string | null | undefined): string {
  if (!html?.trim()) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}
