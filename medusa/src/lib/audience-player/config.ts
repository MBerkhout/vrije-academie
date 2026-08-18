export type AudiencePlayerConfig = {
  clientId: string
  clientSecret: string
  projectId: number
  apiBaseUrl: string
  previewEmail: string
}

export function resolveAudiencePlayerConfig(): AudiencePlayerConfig | null {
  const clientId =
    process.env.AUDIENCE_PLAYER_OAUTH_CLIENT_ID?.trim() ||
    process.env.AUDIENCE_PLAYER_CLIENT_ID?.trim() ||
    ""
  const clientSecret =
    process.env.AUDIENCE_PLAYER_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.AUDIENCE_PLAYER_CLIENT_SECRET?.trim() ||
    ""

  if (!clientId || !clientSecret) return null

  const projectId = Number(process.env.AUDIENCE_PLAYER_PROJECT_ID ?? 14)
  if (!Number.isFinite(projectId) || projectId <= 0) return null

  const apiBaseUrl = (
    process.env.AUDIENCE_PLAYER_API_URL?.trim() || "https://api.audienceplayer.com"
  ).replace(/\/$/, "")

  const previewEmail =
    process.env.AUDIENCE_PLAYER_PREVIEW_EMAIL?.trim() ||
    "vathuis-preview@vrijeacademie.nl"

  return { clientId, clientSecret, projectId, apiBaseUrl, previewEmail }
}

export function resolveAudienceProjectId(
  metadataProjectId?: number | null
): number {
  if (typeof metadataProjectId === "number" && Number.isFinite(metadataProjectId)) {
    return metadataProjectId
  }
  return Number(process.env.AUDIENCE_PLAYER_PROJECT_ID ?? 14)
}
