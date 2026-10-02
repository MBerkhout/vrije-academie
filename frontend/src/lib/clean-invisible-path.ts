const INVISIBLE_CHARS = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g

/**
 * Returns the cleaned pathname when it contains invisible characters (e.g. `…%E2%80%8B%EF%BB%BF`),
 * otherwise `null`. Used to redirect legacy/shared links to the canonical URL.
 */
export function cleanInvisiblePath(pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const cleaned = decoded.replace(INVISIBLE_CHARS, '')
  if (cleaned === decoded) return null
  return cleaned
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}
