import nl from '@/locales/nl.json'

export type StorefrontMessages = typeof nl

/** Default Dutch copy for the storefront. Replace or merge with CMS-provided overrides (e.g. cached Sanity JSON). */
export const defaultMessages: StorefrontMessages = nl

/**
 * Replace `{key}` placeholders in a string (simple mustache-style).
 * Unknown keys become empty strings.
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key]
    return v !== undefined && v !== null ? String(v) : ''
  })
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function deepMergeRecords(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(patch)) {
    const pk = patch[key]
    const bk = base[key]
    if (pk === undefined) continue
    if (isPlainObject(pk) && isPlainObject(bk)) {
      out[key] = deepMergeRecords(bk, pk as Record<string, unknown>)
    } else {
      out[key] = pk
    }
  }
  return out
}

/**
 * Deep-merge partial message overrides onto defaults (e.g. from Sanity).
 * Arrays and non-objects are replaced wholesale when the patch provides a value.
 */
export function mergeMessages(
  base: StorefrontMessages,
  patch: Record<string, unknown> | null | undefined,
): StorefrontMessages {
  if (!patch) return base
  return deepMergeRecords(
    base as unknown as Record<string, unknown>,
    patch,
  ) as StorefrontMessages
}
