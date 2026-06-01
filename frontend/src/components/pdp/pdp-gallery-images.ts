export type PdpGalleryImage = {
  url: string
  caption?: string | null
}

/** Normalize URL list to gallery items (dedupe, max 4 artwork slots). */
export function toPdpGalleryImages(urls: string[]): PdpGalleryImage[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const url of urls) {
    if (!url?.trim() || seen.has(url)) continue
    seen.add(url)
    unique.push(url)
    if (unique.length >= 4) break
  }

  return unique.map((url) => ({ url }))
}
