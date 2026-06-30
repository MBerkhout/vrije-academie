/** Salesforce CTA bar fields mirrored on Medusa product metadata. */
export type ProductCtaBar = {
  label: string
  color: string
  colorHover: string
}

export function normalizeSalesforceHexColor(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim().replace(/^#/, "")
  if (!trimmed || !/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) return null
  return `#${trimmed}`
}

export function ctaBarFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): ProductCtaBar | null {
  const label =
    typeof metadata?.salesforce_cta_label === "string" ? metadata.salesforce_cta_label.trim() : ""
  if (!label) return null

  const color =
    normalizeSalesforceHexColor(
      typeof metadata?.salesforce_cta_color === "string" ? metadata.salesforce_cta_color : null
    ) ?? "#ffffff"
  const colorHover =
    normalizeSalesforceHexColor(
      typeof metadata?.salesforce_cta_color_hover === "string"
        ? metadata.salesforce_cta_color_hover
        : null
    ) ?? color

  return { label, color, colorHover }
}

export function ctaBarFieldsFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): {
  badge: string | null
  cta_color: string | null
  cta_color_hover: string | null
} {
  const bar = ctaBarFromMetadata(metadata)
  if (!bar) {
    return { badge: null, cta_color: null, cta_color_hover: null }
  }
  return {
    badge: bar.label,
    cta_color: bar.color,
    cta_color_hover: bar.colorHover,
  }
}
