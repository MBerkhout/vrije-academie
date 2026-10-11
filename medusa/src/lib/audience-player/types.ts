export type AudiencePlayerPlaybackConfig = {
  projectId: number
  apiBaseUrl: string
  articleId: number
  assetId: number
  token: string
  durationSeconds: number | null
  /** Video still from Audience Player `Asset.screenshots` (public CDN URL). */
  posterUrl?: string | null
}
