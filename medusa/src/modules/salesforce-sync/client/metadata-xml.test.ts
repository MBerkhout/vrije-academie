import { describe, expect, it } from "vitest"

import {
  customFieldMetadataXml,
  customLabelMetadataXml,
  escapeXml,
  isAlreadyExistsResult,
  metadataSoapInstanceUrl,
  parseMetadataResults,
  parseSoapFault,
  permissionSetMetadataXml,
} from "./metadata-xml"
import {
  MEDUSA_ADMIN_BASE_URL_LABEL,
  MEDUSA_ADMIN_URL_FIELD,
  ORDER_DISPLAY_ID_FIELD,
  ORDER_EMAIL_FIELD,
  ORDER_STATUS_FIELD,
  ORDER_TOTAL_CENTS_FIELD,
  PRODUCT_EXTERNAL_ID_FIELD,
  PRODUCT_GROUP_ID_FIELD,
  VARIANT_EXTERNAL_ID_FIELD,
  chunkMetadata,
  giftCardAdminUrlFormula,
  medusaCustomFieldSpecs,
  normalizeMedusaAdminUrl,
  orderAdminUrlFormula,
  orderIdPrefixAdminUrlFormula,
  productAdminUrlFormula,
} from "../utils/medusa-custom-fields-spec"
import {
  ORDER_EXTERNAL_ID_FIELD,
  ORDER_ITEM_EXTERNAL_ID_FIELD,
  REGISTRATION_EXTERNAL_ID_FIELD,
  VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD,
} from "../utils/salesforce-config"
import { productMapping } from "../mappings/product"
import { variantMapping } from "../mappings/variant"

describe("medusa custom field specs", () => {
  it("normalizes admin URLs", () => {
    expect(normalizeMedusaAdminUrl("https://medusa.example.com/")).toBe("https://medusa.example.com")
    expect(normalizeMedusaAdminUrl("http://localhost:9000")).toBe("http://localhost:9000")
    expect(() => normalizeMedusaAdminUrl("medusa.example.com")).toThrow(/http/)
  })

  it("covers mapping external id fields plus order metadata", () => {
    const names = new Set(medusaCustomFieldSpecs().map((f) => `${f.objectApiName}.${f.fieldApiName}`))
    expect(names.has(`Order.${ORDER_EXTERNAL_ID_FIELD}`)).toBe(true)
    expect(names.has(`Order.${ORDER_DISPLAY_ID_FIELD}`)).toBe(true)
    expect(names.has(`Order.${ORDER_EMAIL_FIELD}`)).toBe(true)
    expect(names.has(`Order.${ORDER_STATUS_FIELD}`)).toBe(true)
    expect(names.has(`Order.${ORDER_TOTAL_CENTS_FIELD}`)).toBe(true)
    expect(names.has(`OrderItem.${ORDER_ITEM_EXTERNAL_ID_FIELD}`)).toBe(true)
    expect(names.has(`Registration__c.${REGISTRATION_EXTERNAL_ID_FIELD}`)).toBe(true)
    expect(names.has(`Voucher__c.${VOUCHER_GIFT_CARD_EXTERNAL_ID_FIELD}`)).toBe(true)
    expect(names.has(`Product2.${productMapping.externalIdField}`)).toBe(true)
    expect(names.has(`Product2.${variantMapping.externalIdField}`)).toBe(true)
    expect(names.has(`Product2.${PRODUCT_GROUP_ID_FIELD}`)).toBe(true)
    expect(names.has(`Product2.${PRODUCT_EXTERNAL_ID_FIELD}`)).toBe(true)
    expect(names.has(`Product2.${VARIANT_EXTERNAL_ID_FIELD}`)).toBe(true)
    expect(names.has(`Order.${MEDUSA_ADMIN_URL_FIELD}`)).toBe(true)
  })

  it("builds HYPERLINK formulas against the custom label", () => {
    expect(orderAdminUrlFormula()).toContain(`$Label.${MEDUSA_ADMIN_BASE_URL_LABEL}`)
    expect(orderAdminUrlFormula()).toContain("/app/orders/")
    expect(orderAdminUrlFormula()).toContain('"_blank"')
    expect(orderIdPrefixAdminUrlFormula(ORDER_ITEM_EXTERNAL_ID_FIELD)).toContain("waitlist:")
    expect(productAdminUrlFormula()).toContain("/app/products/")
    expect(giftCardAdminUrlFormula()).toContain("/app/gift-cards")
  })

  it("chunks Metadata API payloads", () => {
    expect(chunkMetadata([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })
})

describe("metadata XML", () => {
  it("wraps formula concatenation in CDATA", () => {
    const xml = customFieldMetadataXml({
      objectApiName: "Order",
      fieldApiName: "Medusa_Admin_Url__c",
      label: "Open in Medusa",
      kind: { type: "formulaText", formula: orderAdminUrlFormula() },
    })
    expect(xml).toContain("<![CDATA[")
    expect(xml).toContain("$Label.Medusa_Admin_Base_Url")
    expect(xml).toContain("&")
    expect(xml).not.toContain("&amp;")
  })

  it("marks unique text fields as case-sensitive external ids", () => {
    const xml = customFieldMetadataXml({
      objectApiName: "Order",
      fieldApiName: ORDER_EXTERNAL_ID_FIELD,
      label: "Medusa Order Id",
      kind: { type: "text", length: 255, unique: true, externalId: true, caseSensitive: true },
    })
    expect(xml).toContain("<met:externalId>true</met:externalId>")
    expect(xml).toContain("<met:unique>true</met:unique>")
    expect(xml).toContain("<met:caseSensitive>true</met:caseSensitive>")
  })

  it("builds a readable-only formula FLS entry", () => {
    const xml = permissionSetMetadataXml([
      {
        objectApiName: "Order",
        fieldApiName: MEDUSA_ADMIN_URL_FIELD,
        label: "Open in Medusa",
        kind: { type: "formulaText", formula: "1" },
      },
    ])
    expect(xml).toContain("<met:editable>false</met:editable>")
    expect(xml).toContain("Order.Medusa_Admin_Url__c")
  })

  it("builds the admin URL custom label", () => {
    const xml = customLabelMetadataXml({ language: "nl_NL", value: "https://medusa.example.com" })
    expect(xml).toContain(MEDUSA_ADMIN_BASE_URL_LABEL)
    expect(xml).toContain("nl_NL")
    expect(xml).toContain("https://medusa.example.com")
  })

  it("parses SOAP save results and faults", () => {
    const xml = `
      <soapenv:Envelope>
        <soapenv:Body>
          <createMetadataResponse>
            <result>
              <fullName>Order.Medusa_Order_Id__c</fullName>
              <success>true</success>
            </result>
            <result>
              <errors>
                <message>This unique name already exists or has been previously used.</message>
                <statusCode>DUPLICATE_DEVELOPER_NAME</statusCode>
              </errors>
              <fullName>Order.Medusa_Admin_Url__c</fullName>
              <success>false</success>
            </result>
          </createMetadataResponse>
        </soapenv:Body>
      </soapenv:Envelope>`
    const results = parseMetadataResults(xml)
    expect(results[0]).toEqual({
      fullName: "Order.Medusa_Order_Id__c",
      success: true,
      errors: [],
    })
    expect(isAlreadyExistsResult(results[1]!)).toBe(true)
    expect(parseSoapFault("<Fault><faultstring>Invalid Session ID</faultstring></Fault>")).toBe(
      "Invalid Session ID"
    )
    expect(escapeXml(`a&b<"'>`)).toBe("a&amp;b&lt;&quot;&apos;&gt;")
    expect(
      metadataSoapInstanceUrl("https://va.lightning.force.com/")
    ).toBe("https://va.my.salesforce.com")
  })
})
