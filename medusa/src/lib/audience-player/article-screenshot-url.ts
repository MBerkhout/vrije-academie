import { resolveAudiencePlayerConfig } from "./config"

export type ArticleAssetScreenshot = {
  url?: string | null
  width?: number | null
  height?: number | null
}

export type ArticleAssetWithScreenshots = {
  id: number
  screenshots?: ArticleAssetScreenshot[] | null
}

/** Pick the best screenshot URL for the given video asset on an Audience Player article. */
export function pickAssetScreenshotUrl(
  assets: ArticleAssetWithScreenshots[] | null | undefined,
  assetId: number
): string | null {
  if (!assets?.length) return null

  const asset = assets.find((entry) => entry.id === assetId)
  const screenshots = asset?.screenshots?.filter((shot) => shot.url?.trim()) ?? []
  if (!screenshots.length) return null

  const best = [...screenshots].sort(
    (a, b) => (b.width ?? 0) - (a.width ?? 0)
  )[0]
  return best?.url?.trim() ?? null
}

async function graphqlArticle<T>(
  projectId: number,
  apiBaseUrl: string,
  query: string
): Promise<T | null> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/graphql/${projectId}/user`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) return null

  const json = (await response.json()) as {
    data?: T
    errors?: unknown[]
  }

  if (json.errors?.length || !json.data) return null
  return json.data
}

/**
 * Audience Player stores video stills on `Asset.screenshots` (public CloudFront URLs).
 * Article-level `posters` / `images` are often empty for VA Thuis episodes.
 */
export async function fetchAudiencePlayerAssetPosterUrl(input: {
  articleId: number
  assetId: number
  projectId?: number
}): Promise<string | null> {
  const config = resolveAudiencePlayerConfig()
  if (!config) return null

  const projectId = input.projectId ?? config.projectId
  if (!Number.isFinite(projectId) || projectId <= 0) return null

  try {
    const data = await graphqlArticle<{ Article: { assets: ArticleAssetWithScreenshots[] } | null }>(
      projectId,
      config.apiBaseUrl,
      `{
        Article(id: ${input.articleId}) {
          assets {
            id
            screenshots { url width height }
          }
        }
      }`
    )

    return pickAssetScreenshotUrl(data?.Article?.assets, input.assetId)
  } catch {
    return null
  }
}
