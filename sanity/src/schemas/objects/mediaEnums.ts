import { defineField } from "sanity"

/** Width options for block/media containers */
export const WIDTH_OPTIONS = [
  { title: "Narrow (~600px)", value: "narrow" },
  { title: "Normal (~768px)", value: "normal" },
  { title: "Wide (full)", value: "wide" },
] as const

/** Aspect ratio options for images and video */
export const ASPECT_RATIO_OPTIONS = [
  { title: "16:9", value: "16:9" },
  { title: "4:3", value: "4:3" },
  { title: "1:1", value: "1:1" },
  { title: "Free", value: "free" },
] as const

/** Overlay opacity for hero/media with text */
export const OVERLAY_OPTIONS = [
  { title: "None", value: "none" },
  { title: "Light", value: "light" },
  { title: "Medium", value: "medium" },
  { title: "Dark", value: "dark" },
] as const

/** Heading size options (H1–H4) */
export const TITLE_SIZE_OPTIONS = [
  { title: "H1", value: "h1" },
  { title: "H2", value: "h2" },
  { title: "H3", value: "h3" },
  { title: "H4", value: "h4" },
] as const

/** Sectietitel: geen semantische kop (body-achtige weergave) of H1–H4 */
export const EDITORIAL_TITLE_SIZE_OPTIONS = [
  { title: "None", value: "none" },
  ...TITLE_SIZE_OPTIONS,
] as const

/** Title alignment */
export const TITLE_ALIGNMENT_OPTIONS = [
  { title: "Links", value: "left" },
  { title: "Midden", value: "center" },
  { title: "Rechts", value: "right" },
] as const

export const widthField = (overrides?: { name?: string; defaultValue?: string }) =>
  defineField({
    name: overrides?.name ?? "width",
    title: "Width",
    type: "string",
    options: { list: [...WIDTH_OPTIONS] },
    initialValue: overrides?.defaultValue ?? "normal",
  })

export const aspectRatioField = (overrides?: { name?: string; defaultValue?: string }) =>
  defineField({
    name: overrides?.name ?? "aspectRatio",
    title: "Aspect Ratio",
    type: "string",
    options: { list: [...ASPECT_RATIO_OPTIONS] },
    initialValue: overrides?.defaultValue ?? "16:9",
  })

export const overlayField = (overrides?: { name?: string; defaultValue?: string }) =>
  defineField({
    name: overrides?.name ?? "overlayOpacity",
    title: "Overlay",
    type: "string",
    options: { list: [...OVERLAY_OPTIONS] },
    initialValue: overrides?.defaultValue ?? "medium",
  })

/** Dutch postcode: 4 digits + optional 2 letters (case-insensitive) */
export const dutchPostcodeRegex = /^\d{4}\s*[a-zA-Z]{0,2}$/

/** YouTube URL patterns: watch?v=, youtu.be/, embed/ */
export const youtubeUrlRegex =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/

export function extractYoutubeId(url: string): string | null {
  if (!youtubeUrlRegex.test(url)) return null
  const match = url.match(/(?:watch\?v=|youtu\.be\/|embed\/)([\w-]+)/)
  return match ? match[1] : null
}
