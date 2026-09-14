import {
  ORDER_EXTERNAL_ID_FIELD,
  ORDER_ITEM_EXTERNAL_ID_FIELD,
  REGISTRATION_EXTERNAL_ID_FIELD,
  SF_ORDER_ITEM_OBJECT,
  SF_ORDER_OBJECT,
  SF_REGISTRATION_OBJECT,
  SF_VOUCHER_OBJECT,
  VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD,
} from "./salesforce-config"

/** Custom Label holding the Medusa Admin origin (no trailing slash). Formula fields read `$Label.Medusa_Admin_Base_Url`. */
export const MEDUSA_ADMIN_BASE_URL_LABEL = "Medusa_Admin_Base_Url"

export const MEDUSA_ADMIN_URL_FIELD = "Medusa_Admin_Url__c"

export const PRODUCT_EXTERNAL_ID_FIELD = "Medusa_Product_Id__c"
export const VARIANT_EXTERNAL_ID_FIELD = "Medusa_Variant_Id__c"
export const PRODUCT_GROUP_ID_FIELD = "Medusa_Product_Group_Id__c"

export const ORDER_DISPLAY_ID_FIELD = "Medusa_Order_Display_Id__c"
export const ORDER_EMAIL_FIELD = "Medusa_Order_Email__c"
export const ORDER_STATUS_FIELD = "Medusa_Order_Status__c"
export const ORDER_TOTAL_CENTS_FIELD = "Medusa_Order_Total_Cents__c"

export const MEDUSA_SYNC_PERMISSION_SET = "Medusa_Sync"

export const METADATA_CREATE_CHUNK_SIZE = 10

export type MedusaSfFieldKind =
  | {
      type: "text"
      length: number
      unique?: boolean
      externalId?: boolean
      caseSensitive?: boolean
    }
  | { type: "email" }
  | { type: "number"; precision: number; scale: number }
  | { type: "formulaText"; formula: string }

export type MedusaSfFieldSpec = {
  objectApiName: string
  fieldApiName: string
  label: string
  description?: string
  kind: MedusaSfFieldKind
}

export function fullFieldName(field: MedusaSfFieldSpec): string {
  return `${field.objectApiName}.${field.fieldApiName}`
}

export function isFormulaField(field: MedusaSfFieldSpec): boolean {
  return field.kind.type === "formulaText"
}

/** Strip trailing slashes; require http(s). */
export function normalizeMedusaAdminUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, "")
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Medusa admin URL must start with http:// or https:// (got: ${raw})`)
  }
  return url
}

function hyperlink(pathExpr: string): string {
  return `HYPERLINK($Label.${MEDUSA_ADMIN_BASE_URL_LABEL} & ${pathExpr}, "Open in Medusa", "_blank")`
}

export function orderAdminUrlFormula(): string {
  return `IF(ISBLANK(${ORDER_EXTERNAL_ID_FIELD}), "", ${hyperlink(`"/app/orders/" & ${ORDER_EXTERNAL_ID_FIELD}`)})`
}

/** OrderItem / Registration external ids are `{orderId}:…`. Waitlist rows (`waitlist:…`) have no order page. */
export function orderIdPrefixAdminUrlFormula(idField: string): string {
  return `IF(OR(ISBLANK(${idField}), FIND(":", ${idField}) = 0, LEFT(${idField}, 9) = "waitlist:"), "", ${hyperlink(
    `"/app/orders/" & LEFT(${idField}, FIND(":", ${idField}) - 1)`
  )})`
}

export function productAdminUrlFormula(): string {
  const productLink = hyperlink(`"/app/products/" & ${PRODUCT_EXTERNAL_ID_FIELD}`)
  const groupLink = hyperlink(`"/app/products/" & ${PRODUCT_GROUP_ID_FIELD}`)
  return `IF(NOT(ISBLANK(${PRODUCT_EXTERNAL_ID_FIELD})), ${productLink}, IF(NOT(ISBLANK(${PRODUCT_GROUP_ID_FIELD})), ${groupLink}, ""))`
}

export function giftCardAdminUrlFormula(): string {
  return `IF(ISBLANK(${VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD}), "", ${hyperlink(`"/app/gift-cards"`)})`
}

function uniqueExternalIdText(): MedusaSfFieldKind {
  return { type: "text", length: 255, unique: true, externalId: true, caseSensitive: true }
}

const ADMIN_URL_DESCRIPTION =
  "Clickable Medusa Admin link (formula). Base URL is Custom Label Medusa_Admin_Base_Url."

export function medusaCustomFieldSpecs(): MedusaSfFieldSpec[] {
  return [
    {
      objectApiName: SF_ORDER_OBJECT,
      fieldApiName: ORDER_EXTERNAL_ID_FIELD,
      label: "Medusa Order Id",
      description: "Medusa order id (external id for website upserts).",
      kind: uniqueExternalIdText(),
    },
    {
      objectApiName: SF_ORDER_OBJECT,
      fieldApiName: ORDER_DISPLAY_ID_FIELD,
      label: "Medusa Order Display Id",
      kind: { type: "text", length: 40 },
    },
    {
      objectApiName: SF_ORDER_OBJECT,
      fieldApiName: ORDER_EMAIL_FIELD,
      label: "Medusa Order Email",
      kind: { type: "email" },
    },
    {
      objectApiName: SF_ORDER_OBJECT,
      fieldApiName: ORDER_STATUS_FIELD,
      label: "Medusa Order Status",
      kind: { type: "text", length: 80 },
    },
    {
      objectApiName: SF_ORDER_OBJECT,
      fieldApiName: ORDER_TOTAL_CENTS_FIELD,
      label: "Medusa Order Total Cents",
      kind: { type: "number", precision: 18, scale: 0 },
    },
    {
      objectApiName: SF_ORDER_OBJECT,
      fieldApiName: MEDUSA_ADMIN_URL_FIELD,
      label: "Open in Medusa",
      description: ADMIN_URL_DESCRIPTION,
      kind: { type: "formulaText", formula: orderAdminUrlFormula() },
    },
    {
      objectApiName: SF_ORDER_ITEM_OBJECT,
      fieldApiName: ORDER_ITEM_EXTERNAL_ID_FIELD,
      label: "Medusa Order Item Id",
      description: "Stable Medusa line-item id (external id).",
      kind: uniqueExternalIdText(),
    },
    {
      objectApiName: SF_ORDER_ITEM_OBJECT,
      fieldApiName: MEDUSA_ADMIN_URL_FIELD,
      label: "Open in Medusa",
      description: ADMIN_URL_DESCRIPTION,
      kind: { type: "formulaText", formula: orderIdPrefixAdminUrlFormula(ORDER_ITEM_EXTERNAL_ID_FIELD) },
    },
    {
      objectApiName: SF_REGISTRATION_OBJECT,
      fieldApiName: REGISTRATION_EXTERNAL_ID_FIELD,
      label: "Medusa Registration Id",
      description: "Stable Medusa registration id (external id).",
      kind: uniqueExternalIdText(),
    },
    {
      objectApiName: SF_REGISTRATION_OBJECT,
      fieldApiName: MEDUSA_ADMIN_URL_FIELD,
      label: "Open in Medusa",
      description: ADMIN_URL_DESCRIPTION,
      kind: { type: "formulaText", formula: orderIdPrefixAdminUrlFormula(REGISTRATION_EXTERNAL_ID_FIELD) },
    },
    {
      objectApiName: SF_VOUCHER_OBJECT,
      fieldApiName: VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD,
      label: "Medusa Gift Card Id",
      description: "Medusa gift card id (external id).",
      kind: uniqueExternalIdText(),
    },
    {
      objectApiName: SF_VOUCHER_OBJECT,
      fieldApiName: MEDUSA_ADMIN_URL_FIELD,
      label: "Open in Medusa",
      description: ADMIN_URL_DESCRIPTION,
      kind: { type: "formulaText", formula: giftCardAdminUrlFormula() },
    },
    {
      objectApiName: "Product2",
      fieldApiName: PRODUCT_EXTERNAL_ID_FIELD,
      label: "Medusa Product Id",
      description: "Medusa product id (external id).",
      kind: uniqueExternalIdText(),
    },
    {
      objectApiName: "Product2",
      fieldApiName: VARIANT_EXTERNAL_ID_FIELD,
      label: "Medusa Variant Id",
      description: "Medusa variant id (external id).",
      kind: uniqueExternalIdText(),
    },
    {
      objectApiName: "Product2",
      fieldApiName: PRODUCT_GROUP_ID_FIELD,
      label: "Medusa Product Group Id",
      description: "Parent Medusa product id on variant Product2 rows.",
      kind: { type: "text", length: 255 },
    },
    {
      objectApiName: "Product2",
      fieldApiName: MEDUSA_ADMIN_URL_FIELD,
      label: "Open in Medusa",
      description: ADMIN_URL_DESCRIPTION,
      kind: { type: "formulaText", formula: productAdminUrlFormula() },
    },
  ]
}

export function dataFields(specs = medusaCustomFieldSpecs()): MedusaSfFieldSpec[] {
  return specs.filter((f) => !isFormulaField(f))
}

export function formulaFields(specs = medusaCustomFieldSpecs()): MedusaSfFieldSpec[] {
  return specs.filter(isFormulaField)
}

export function chunkMetadata<T>(items: T[], size = METADATA_CREATE_CHUNK_SIZE): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}
