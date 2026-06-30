export type ProductCtaBar = {
  label: string
  color: string
  colorHover: string
}

export function productCtaBarFromEvent(event: {
  badge?: string | null
  cta_color?: string | null
  cta_color_hover?: string | null
}): ProductCtaBar | null {
  const label = event.badge?.trim()
  if (!label) return null
  const color = event.cta_color?.trim() || '#ffffff'
  const colorHover = event.cta_color_hover?.trim() || color
  return { label, color, colorHover }
}

/** Pick readable text color (black or white) for a hex background. */
export function textColorForHexBackground(hex: string): '#000000' | '#ffffff' {
  const normalized = hex.replace(/^#/, '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.slice(0, 6)
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}
