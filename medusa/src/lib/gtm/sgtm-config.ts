export function isSgtmEnabled(): boolean {
  if (process.env.SGTM_ENABLED === "false") return false
  return Boolean(process.env.SGTM_ENDPOINT_URL?.trim())
}

export function sgtmEndpointUrl(): string {
  const base = process.env.SGTM_ENDPOINT_URL?.trim()
  if (!base) {
    throw new Error("SGTM_ENDPOINT_URL is not configured")
  }
  const path = process.env.SGTM_EVENT_PATH?.trim()
  if (!path) return base
  if (path.startsWith("http")) return path
  const normalizedBase = base.replace(/\/$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}
