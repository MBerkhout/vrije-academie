import {
  MEDUSA_ADMIN_BASE_URL_LABEL,
  MEDUSA_SYNC_PERMISSION_SET,
  type MedusaSfFieldSpec,
  fullFieldName,
  isFormulaField,
} from "../utils/medusa-custom-fields-spec"

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function customLabelMetadataXml(input: {
  language: string
  value: string
}): string {
  return [
    `<met:metadata xsi:type="met:CustomLabel">`,
    `<met:fullName>${escapeXml(MEDUSA_ADMIN_BASE_URL_LABEL)}</met:fullName>`,
    `<met:categories>Medusa</met:categories>`,
    `<met:language>${escapeXml(input.language)}</met:language>`,
    `<met:protected>false</met:protected>`,
    `<met:shortDescription>Medusa Admin Base URL</met:shortDescription>`,
    `<met:value>${escapeXml(input.value)}</met:value>`,
    `</met:metadata>`,
  ].join("")
}

export function customFieldMetadataXml(field: MedusaSfFieldSpec): string {
  const lines = [
    `<met:metadata xsi:type="met:CustomField">`,
    `<met:fullName>${escapeXml(fullFieldName(field))}</met:fullName>`,
    `<met:label>${escapeXml(field.label)}</met:label>`,
  ]
  if (field.description) {
    lines.push(`<met:description>${escapeXml(field.description)}</met:description>`)
  }

  switch (field.kind.type) {
    case "text":
      lines.push(`<met:type>Text</met:type>`)
      lines.push(`<met:length>${field.kind.length}</met:length>`)
      lines.push(`<met:required>false</met:required>`)
      if (field.kind.externalId) lines.push(`<met:externalId>true</met:externalId>`)
      if (field.kind.unique) {
        lines.push(`<met:unique>true</met:unique>`)
        lines.push(
          `<met:caseSensitive>${field.kind.caseSensitive === false ? "false" : "true"}</met:caseSensitive>`
        )
      }
      break
    case "email":
      lines.push(`<met:type>Email</met:type>`)
      lines.push(`<met:required>false</met:required>`)
      break
    case "number":
      lines.push(`<met:type>Number</met:type>`)
      lines.push(`<met:precision>${field.kind.precision}</met:precision>`)
      lines.push(`<met:scale>${field.kind.scale}</met:scale>`)
      lines.push(`<met:required>false</met:required>`)
      break
    case "formulaText":
      lines.push(`<met:type>Text</met:type>`)
      lines.push(`<met:formula><![CDATA[${field.kind.formula}]]></met:formula>`)
      lines.push(`<met:formulaTreatBlanksAs>BlankAsBlank</met:formulaTreatBlanksAs>`)
      break
  }

  lines.push(`</met:metadata>`)
  return lines.join("")
}

export function permissionSetMetadataXml(fields: MedusaSfFieldSpec[]): string {
  const perms = fields
    .map((field) => {
      const editable = isFormulaField(field) ? "false" : "true"
      return [
        `<met:fieldPermissions>`,
        `<met:editable>${editable}</met:editable>`,
        `<met:field>${escapeXml(fullFieldName(field))}</met:field>`,
        `<met:readable>true</met:readable>`,
        `</met:fieldPermissions>`,
      ].join("")
    })
    .join("")

  return [
    `<met:metadata xsi:type="met:PermissionSet">`,
    `<met:fullName>${escapeXml(MEDUSA_SYNC_PERMISSION_SET)}</met:fullName>`,
    `<met:label>Medusa Sync</met:label>`,
    `<met:description>Medusa identifier fields and Open in Medusa formula links.</met:description>`,
    `<met:hasActivationRequired>false</met:hasActivationRequired>`,
    perms,
    `</met:metadata>`,
  ].join("")
}

export type MetadataSaveResult = {
  fullName: string
  success: boolean
  errors: Array<{ message: string; statusCode?: string }>
}

function tagContents(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:[\\w.-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}>`, "gi")
  const out: string[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(xml))) {
    out.push(match[1] ?? "")
  }
  return out
}

function firstTag(xml: string, tag: string): string | undefined {
  return tagContents(xml, tag)[0]
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

export function parseSoapFault(xml: string): string | null {
  const fault = firstTag(xml, "faultstring")
  return fault ? decodeXml(fault.trim()) : null
}

export function parseMetadataResults(xml: string): MetadataSaveResult[] {
  const fault = parseSoapFault(xml)
  if (fault) {
    throw new Error(`Salesforce Metadata SOAP fault: ${fault}`)
  }

  return tagContents(xml, "result").map((block) => {
    const errorBlocks = tagContents(block, "errors")
    const errors = errorBlocks.map((err) => ({
      message: decodeXml((firstTag(err, "message") ?? "").trim()),
      statusCode: firstTag(err, "statusCode")?.trim(),
    }))
    return {
      fullName: decodeXml((firstTag(block, "fullName") ?? "").trim()),
      success: (firstTag(block, "success") ?? "").trim().toLowerCase() === "true",
      errors,
    }
  })
}

/** Duplicate developer name / already exists — treat as a no-op skip. */
export function isAlreadyExistsResult(result: MetadataSaveResult): boolean {
  const blob = `${result.errors.map((e) => `${e.statusCode ?? ""} ${e.message}`).join(" ")}`.toUpperCase()
  return (
    blob.includes("DUPLICATE") ||
    blob.includes("ALREADY EXISTS") ||
    blob.includes("ALREADY IN USE")
  )
}

/** Lightning host is not valid for Metadata SOAP; use the classic my.salesforce.com instance. */
export function metadataSoapInstanceUrl(instanceUrl: string): string {
  return instanceUrl.replace(/\/$/, "").replace(/\.lightning\.force\.com$/i, ".my.salesforce.com")
}

export function metadataSoapEnvelope(
  operation: "createMetadata" | "updateMetadata",
  itemsXml: string[],
  sessionId: string
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header>
    <met:SessionHeader>
      <met:sessionId>${escapeXml(sessionId)}</met:sessionId>
    </met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:${operation}>
      ${itemsXml.join("")}
    </met:${operation}>
  </soapenv:Body>
</soapenv:Envelope>`
}
