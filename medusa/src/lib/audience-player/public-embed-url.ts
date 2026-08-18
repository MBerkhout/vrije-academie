/**
 * Public preview iframe host (tenant subdomain). Unlike embed.audienceplayer.com,
 * these URLs work without OAuth tokens for preview-marked content.
 *
 * Example: https://vrijeacademie.audienceplayer.com/_embed/video-player?articleId=339&assetId=200
 */
export function resolveAudiencePlayerPublicEmbedHost(): string {
  return (
    process.env.AUDIENCE_PLAYER_PUBLIC_EMBED_HOST?.trim() ||
    "https://vrijeacademie.audienceplayer.com"
  ).replace(/\/$/, "")
}

export function buildPublicPreviewEmbedUrl(articleId: number, assetId: number): string {
  const host = resolveAudiencePlayerPublicEmbedHost()
  const params = new URLSearchParams({
    articleId: String(articleId),
    assetId: String(assetId),
  })
  return `${host}/_embed/video-player?${params.toString()}`
}

/** True when URL uses the tenant public embed path (works without token). */
export function isPublicPreviewEmbedUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  try {
    const parsed = new URL(url.trim())
    return parsed.pathname.includes("/_embed/video-player")
  } catch {
    return false
  }
}
