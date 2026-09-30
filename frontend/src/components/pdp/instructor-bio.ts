import { decodePdpGalleryCaptionEntities } from '@/components/pdp/pdp-gallery-images'

/** Plain teacher bio for PDP hover and featured blocks. Salesforce stores HTML entities such as `&#39;`. */
export function instructorBioText(bio: string | null | undefined): string | null {
  const trimmed = bio?.trim()
  if (!trimmed) return null
  const decoded = decodePdpGalleryCaptionEntities(trimmed).replace(/\u00a0/g, ' ').trim()
  return decoded || null
}
