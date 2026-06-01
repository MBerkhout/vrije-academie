/**
 * Turn any anchor / section label from the CMS into a valid HTML `id` and URL hash fragment.
 * Matches the logic used for tab #hash slugs in TabsBlock.
 */
export function anchorIdFromString(input: string | null | undefined): string {
  if (input == null || typeof input !== 'string') return ''
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
