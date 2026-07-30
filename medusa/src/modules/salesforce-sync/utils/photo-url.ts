/**
 * Salesforce rich-text fields (and the Account.PhotoUrl field) commonly contain
 * session-relative paths like `/services/images/photo/001xx...` or `/servlet/rtaImage?...`,
 * or absolute URLs on `*.salesforce.com` / `*.force.com`. Those only resolve inside an
 * authenticated Salesforce session — served on our own domain (or unauthenticated) they
 * 404/redirect to a login page, which Next's image optimizer reports as
 * "isn't a valid image ... received null". Only absolute, publicly reachable URLs are
 * usable as a photo source.
 */
export function isUsablePhotoUrl(url: string | null | undefined): url is string {
  if (!url) return false
  if (!/^https?:\/\//i.test(url)) return false
  try {
    const { hostname } = new URL(url)
    return !/(^|\.)salesforce\.com$|(^|\.)force\.com$/i.test(hostname)
  } catch {
    return false
  }
}
