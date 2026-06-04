import { defineField, type StringRule } from "sanity"

/** Paths like /ons-aanbod or /ons-aanbod?record_type=collegereeks */
const RELATIVE_PATH = /^\/[^\s]*$/

export const CTA_URL_DESCRIPTION =
  "Site path (e.g. /ons-aanbod) or full URL (https://…, mailto:…)."

export function isValidCtaUrl(value: string): boolean {
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
  const v = String(value).trim()
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
