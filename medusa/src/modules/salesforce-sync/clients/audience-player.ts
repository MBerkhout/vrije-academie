export type VathuisEpisode = {
  number: number
  title: string
  description: string | null
  duration_seconds: number | null
  duration_label: string | null
  audience_article_id: number
  audience_asset_id: number | null
  preview_available: boolean
  embed_url: string | null
  chapter_number: number
}

export type VathuisChapter = {
  number: number
  title: string
  episodes: VathuisEpisode[]
}

type AudienceArticleNode = {
  id: number
  name?: string | null
  metas?: { key: string; value?: string | null }[] | null
  assets?: { id: number; duration?: number | null }[] | null
  children?: AudienceArticleNode[] | null
}

export type AudiencePlayerEmbedOptions = {
  projectId: number
  previewUrl?: string | null
  iframeUrl?: string | null
}

const ARTICLE_WITH_CHAPTERS_QUERY = `
  query Article($articleId: Int!) {
    Article(id: $articleId) {
      id
      name
      children {
        id
        name
        metas { key value }
        children {
          id
          name
          metas { key value }
          assets { id duration }
        }
      }
    }
  }
`

function metaValue(metas: AudienceArticleNode["metas"], key: string): string | null {
  const row = metas?.find((m) => m.key === key)
  const value = row?.value?.trim()
  return value || null
}

export function formatDurationLabel(totalSeconds: number | null | undefined): string | null {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return null
  const total = Math.round(totalSeconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function buildAudiencePlayerEmbedUrl(
  options: AudiencePlayerEmbedOptions & {
    articleId: number
    assetId: number | null
    previewEpisode?: boolean
  }
): string | null {
  if (options.previewEpisode && options.previewUrl?.trim()) {
    return options.previewUrl.trim()
  }
  if (options.iframeUrl?.trim()) {
    return options.iframeUrl.trim()
  }
  if (!options.assetId) return null

  const template =
    process.env.AUDIENCE_PLAYER_IFRAME_URL?.trim() ||
    "https://embed.audienceplayer.com/{projectId}/article/{articleId}/asset/{assetId}"

  return template
    .replace("{projectId}", String(options.projectId))
    .replace("{articleId}", String(options.articleId))
    .replace("{assetId}", String(options.assetId))
}

function mapEpisode(
  node: AudienceArticleNode,
  episodeIndex: number,
  chapterNumber: number,
  embedOptions: AudiencePlayerEmbedOptions
): VathuisEpisode {
  const asset = node.assets?.[0]
  const durationSeconds =
    typeof asset?.duration === "number" && Number.isFinite(asset.duration)
      ? Math.round(asset.duration)
      : null
  const previewAvailable = chapterNumber === 1 && episodeIndex === 0

  return {
    number: episodeIndex + 1,
    title: metaValue(node.metas, "title") ?? `Aflevering ${episodeIndex + 1}`,
    description:
      metaValue(node.metas, "description_short") ?? metaValue(node.metas, "description"),
    duration_seconds: durationSeconds,
    duration_label: formatDurationLabel(durationSeconds),
    audience_article_id: node.id,
    audience_asset_id: asset?.id ?? null,
    preview_available: previewAvailable,
    embed_url: buildAudiencePlayerEmbedUrl({
      ...embedOptions,
      articleId: node.id,
      assetId: asset?.id ?? null,
      previewEpisode: previewAvailable,
    }),
    chapter_number: chapterNumber,
  }
}

function resolveChapters(
  root: AudienceArticleNode | null | undefined,
  embedOptions: AudiencePlayerEmbedOptions
): VathuisChapter[] {
  const seasons = root?.children ?? []

  return seasons
    .filter((season) => typeof season.id === "number")
    .map((season, chapterIndex) => {
      const chapterNumber = chapterIndex + 1
      const episodes = (season.children ?? [])
        .filter((node) => typeof node.id === "number")
        .map((node, episodeIndex) => mapEpisode(node, episodeIndex, chapterNumber, embedOptions))

      return {
        number: chapterNumber,
        title:
          metaValue(season.metas, "title") ??
          season.name?.trim() ??
          `Hoofdstuk ${chapterNumber}`,
        episodes,
      }
    })
    .filter((chapter) => chapter.episodes.length > 0)
}

/** @deprecated Use fetchVathuisChaptersFromAudiencePlayer — kept for flat episode list compat. */
function resolveEpisodeNodes(root: AudienceArticleNode | null | undefined): AudienceArticleNode[] {
  const chapters = root?.children ?? []
  if (chapters.length === 0) return []
  if (chapters.length === 1) {
    return (chapters[0]?.children ?? []).filter((node) => typeof node.id === "number")
  }
  return chapters.flatMap((chapter) =>
    (chapter.children ?? []).filter((node) => typeof node.id === "number")
  )
}

export function isVathuisRecordType(developerName: string | null | undefined): boolean {
  const normalized = (developerName ?? "").trim().toLowerCase()
  return normalized === "lezingen_thuis" || normalized === "thuis_college"
}

export async function fetchVathuisChaptersFromAudiencePlayer(
  articleId: number,
  options?: { projectId?: number; apiBaseUrl?: string; embed?: AudiencePlayerEmbedOptions }
): Promise<VathuisChapter[]> {
  const projectId = options?.projectId ?? Number(process.env.AUDIENCE_PLAYER_PROJECT_ID ?? 14)
  const apiBaseUrl = (
    options?.apiBaseUrl ?? process.env.AUDIENCE_PLAYER_API_URL ?? "https://api.audienceplayer.com"
  ).replace(/\/$/, "")

  if (!Number.isFinite(articleId) || articleId <= 0) return []
  if (!Number.isFinite(projectId) || projectId <= 0) return []

  const url = `${apiBaseUrl}/graphql/${projectId}/user`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: ARTICLE_WITH_CHAPTERS_QUERY,
      variables: { articleId },
    }),
  })

  if (!response.ok) {
    throw new Error(`Audience Player API HTTP ${response.status}`)
  }

  const json = (await response.json()) as {
    data?: { Article?: AudienceArticleNode | null }
    errors?: { message?: string }[]
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "Audience Player GraphQL error")
  }

  const embedOptions: AudiencePlayerEmbedOptions = {
    projectId,
    previewUrl: options?.embed?.previewUrl ?? null,
    iframeUrl: options?.embed?.iframeUrl ?? null,
  }

  return resolveChapters(json.data?.Article, embedOptions)
}

export async function fetchVathuisEpisodesFromAudiencePlayer(
  articleId: number,
  options?: { projectId?: number; apiBaseUrl?: string; embed?: AudiencePlayerEmbedOptions }
): Promise<VathuisEpisode[]> {
  const chapters = await fetchVathuisChaptersFromAudiencePlayer(articleId, options)
  if (chapters.length > 0) {
    return chapters.flatMap((chapter) => chapter.episodes)
  }

  const projectId = options?.projectId ?? Number(process.env.AUDIENCE_PLAYER_PROJECT_ID ?? 14)
  const apiBaseUrl = (
    options?.apiBaseUrl ?? process.env.AUDIENCE_PLAYER_API_URL ?? "https://api.audienceplayer.com"
  ).replace(/\/$/, "")

  const url = `${apiBaseUrl}/graphql/${projectId}/user`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: ARTICLE_WITH_CHAPTERS_QUERY,
      variables: { articleId },
    }),
  })

  if (!response.ok) {
    throw new Error(`Audience Player API HTTP ${response.status}`)
  }

  const json = (await response.json()) as {
    data?: { Article?: AudienceArticleNode | null }
    errors?: { message?: string }[]
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "Audience Player GraphQL error")
  }

  const embedOptions: AudiencePlayerEmbedOptions = {
    projectId,
    previewUrl: options?.embed?.previewUrl ?? null,
    iframeUrl: options?.embed?.iframeUrl ?? null,
  }

  return resolveEpisodeNodes(json.data?.Article).map((node, index) =>
    mapEpisode(node, index, 1, embedOptions)
  )
}
