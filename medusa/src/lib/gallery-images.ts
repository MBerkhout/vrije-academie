/** Salesforce gallery slot (`Image_N_Url__c` + `Image_N_Source__c`). */
export type StoreGalleryImage = {
  url: string
  caption: string | null
}

function captionByUrlFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): Map<string, string | null> {
  const map = new Map<string, string | null>()
  const gallery = metadata?.salesforce_gallery_images
  if (!Array.isArray(gallery)) return map

  for (const item of gallery) {
    if (!item || typeof item !== "object") continue
    const url =
      typeof (item as { url?: unknown }).url === "string"
        ? (item as { url: string }).url.trim()
        : ""
    if (!url || map.has(url)) continue
    const caption = (item as { caption?: unknown }).caption
    map.set(url, typeof caption === "string" && caption.trim() ? caption.trim() : null)
  }

  return map
}

export function zipImageUrlsWithCaptions(
  urls: string[],
  metadata: Record<string, unknown> | null | undefined
): StoreGalleryImage[] {
  const captionByUrl = captionByUrlFromMetadata(metadata)
  return urls.map((url) => ({
    url,
    caption: captionByUrl.get(url) ?? null,
  }))
}

export function imageCaptionsForUrls(
  urls: string[],
  metadata: Record<string, unknown> | null | undefined
): (string | null)[] {
  return zipImageUrlsWithCaptions(urls, metadata).map((img) => img.caption)
}
