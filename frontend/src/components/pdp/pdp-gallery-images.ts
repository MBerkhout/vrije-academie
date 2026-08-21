export type PdpGalleryImage = {
  url: string
  caption?: string | null
}

type GalleryImageInput = string | { url?: string | null; caption?: string | null }

/** Composite artwork credits in Salesforce use ` | ` between the two halves. */
export function formatPdpGalleryCaption(caption: string): string {
  return caption.replace(/\s*\|\s*/g, '\n')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Plain caption text for alt attributes and other non-HTML contexts. */
export function stripPdpGalleryCaptionHtml(caption: string): string {
  return formatPdpGalleryCaption(caption).replace(/<[^>]+>/g, '')
}

/** Caption HTML for hover overlays; keeps inline emphasis tags from Salesforce. */
export function formatPdpGalleryCaptionHtml(caption: string): string {
  const escaped = escapeHtml(formatPdpGalleryCaption(caption))
  return escaped.replace(/&lt;(\/?(?:em|strong))&gt;/gi, '<$1>')
}

/** Normalize URL list or `{ url, caption }` items to gallery tiles (dedupe, max 4). */
export function toPdpGalleryImages(images: GalleryImageInput[]): PdpGalleryImage[] {
  const seen = new Set<string>()
  const unique: PdpGalleryImage[] = []

  for (const item of images) {
    const url = (typeof item === 'string' ? item : item.url)?.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    const caption =
      typeof item === 'string' ? null : item.caption?.trim() || null
    unique.push({ url, caption })
    if (unique.length >= 4) break
  }

  return unique
}
