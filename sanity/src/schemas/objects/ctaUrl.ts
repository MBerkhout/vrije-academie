import { defineField, type StringRule } from "sanity"

/** Paths like /ons-aanbod or /ons-aanbod?record_type=collegereeks */
const RELATIVE_PATH = /^\/[^\s]*$/

export const CTA_URL_DESCRIPTION =
  "Site path (e.g. /ons-aanbod) or full URL (https://…, mailto:…)."

/** Zero-width / BOM / bidi characters that are invisible in Studio but break URLs. */
const INVISIBLE_CHARS = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/

export function isValidCtaUrl(value: string): boolean {
  if (INVISIBLE_CHARS.test(value)) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (RELATIVE_PATH.test(trimmed)) return true
  if (/^mailto:/i.test(trimmed)) return /^mailto:[^\s]+$/i.test(trimmed)
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function ctaUrlFormatMessage(value: unknown): true | string {
  if (value == null || value === "") return true
  const v = String(value)
  if (INVISIBLE_CHARS.test(v)) {
    return "De URL bevat onzichtbare tekens (bijv. door plakken). Verwijder ze en typ de URL opnieuw."
  }
  return isValidCtaUrl(v) ? true : "Voer een geldig pad (bijv. /ons-aanbod) of URL in."
}

/** Append to an existing string field rule (required checks should run first). */
export function withCtaUrlFormat(
  rule: StringRule,
): StringRule {
  return rule.custom((value) => ctaUrlFormatMessage(value))
}

type CtaUrlFieldConfig = Parameters<typeof defineField>[0] & {
  name: string
  title?: string
}

/** String field for CTA / navigation links (relative paths and absolute URLs). */
export function defineCtaUrlField(config: CtaUrlFieldConfig) {
  const { validation, description, ...rest } = config
  return defineField({
    type: "string",
    description: description ?? CTA_URL_DESCRIPTION,
    ...rest,
    validation: (Rule) => {
      const base = validation ? validation(Rule) : Rule
      return withCtaUrlFormat(base as StringRule)
    },
  })
}
