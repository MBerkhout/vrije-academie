'use client'

/** Used by SanityLive on Next.js 16 so live events call router.refresh() instead of tag-only revalidation. */
export async function refreshOnPresentation(): Promise<'refresh'> {
  return 'refresh'
}
