export type PdpGalleryImage = {
  url: string
  caption?: string | null
}

type GalleryImageInput = string | { url?: string | null; caption?: string | null }

/** Composite artwork credits in Salesforce use ` | ` between the two halves. */
export function formatPdpGalleryCaption(caption: string): string {
  return caption.replace(/\s*\|\s*/g, '\n')
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
