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
  parent_id?: number | null
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

const ARTICLE_SEASON_TITLE_QUERY = `
  query Article($articleId: Int!) {
    Article(id: $articleId) {
      id
      name
      metas { key value }
    }
  }
`

const ARTICLE_LIST_EPISODES_QUERY = `
  query ArticleListEpisodes($ancestorId: Int!, $limit: Int!, $offset: Int!) {
    ArticleList(ancestor_id: $ancestorId, types: [episode], limit: $limit, offset: $offset) {
      items {
        id
        name
        parent_id
        metas { key value }
        assets { id duration }
      }
    }
  }
`

const ANCESTOR_EPISODE_PAGE_SIZE = 100

import {
  buildPublicPreviewEmbedUrl,
} from "../../../lib/audience-player/public-embed-url"

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
  if (!options.previewEpisode) return null

  if (options.previewUrl?.trim()) {
    return options.previewUrl.trim()
  }
  if (options.iframeUrl?.trim()) {
    return options.iframeUrl.trim()
  }
  if (!options.assetId) return null

  return buildPublicPreviewEmbedUrl(options.articleId, options.assetId)
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

function compareEpisodeOrder(a: AudienceArticleNode, b: AudienceArticleNode): number {
  const nameA = (a.name ?? "").trim()
  const nameB = (b.name ?? "").trim()
  if (nameA && nameB && nameA !== nameB) {
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" })
  }
  return a.id - b.id
}

/** Group descendant episodes (from ArticleList ancestor_id) into storefront chapters. */
export function resolveChaptersFromDescendantEpisodes(
  episodes: AudienceArticleNode[],
  embedOptions: AudiencePlayerEmbedOptions,
  seasonTitlesById?: ReadonlyMap<number, string>
): VathuisChapter[] {
  if (episodes.length === 0) return []

  const byParent = new Map<number, AudienceArticleNode[]>()
  for (const episode of episodes) {
    if (typeof episode.id !== "number") continue
    const parentId = typeof episode.parent_id === "number" ? episode.parent_id : 0
    const bucket = byParent.get(parentId) ?? []
    bucket.push(episode)
    byParent.set(parentId, bucket)
  }

  const parentIds = [...byParent.keys()].sort((a, b) => a - b)

  return parentIds
    .map((parentId, chapterIndex) => {
      const chapterNumber = chapterIndex + 1
      const nodes = [...(byParent.get(parentId) ?? [])].sort(compareEpisodeOrder)
      const mappedEpisodes = nodes.map((node, episodeIndex) =>
        mapEpisode(node, episodeIndex, chapterNumber, embedOptions)
      )
      const seasonTitle = parentId > 0 ? seasonTitlesById?.get(parentId) : undefined

      return {
        number: chapterNumber,
        title: seasonTitle?.trim() || `Hoofdstuk ${chapterNumber}`,
        episodes: mappedEpisodes,
      }
    })
    .filter((chapter) => chapter.episodes.length > 0)
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

type AudienceGraphqlOptions = {
  projectId: number
  apiBaseUrl: string
}

async function audiencePlayerGraphql<T>(
  options: AudienceGraphqlOptions,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const url = `${options.apiBaseUrl}/graphql/${options.projectId}/user`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Audience Player API HTTP ${response.status}`)
  }

  const json = (await response.json()) as {
    data?: T
    errors?: { message?: string }[]
  }

  if (json.errors?.length) {
    const message = json.errors[0]?.message ?? "Audience Player GraphQL error"
    if (/not found/i.test(message)) {
      return {} as T
    }
    throw new Error(message)
  }

  return json.data ?? ({} as T)
}

async function fetchSeasonTitles(
  graphql: AudienceGraphqlOptions,
  seasonIds: number[]
): Promise<Map<number, string>> {
  const titles = new Map<number, string>()
  await Promise.all(
    seasonIds.map(async (seasonId) => {
      if (seasonId <= 0) return
      try {
        const data = await audiencePlayerGraphql<{ Article?: AudienceArticleNode | null }>(
          graphql,
          ARTICLE_SEASON_TITLE_QUERY,
          { articleId: seasonId }
        )
        const season = data.Article
        if (!season) return
        const title =
          metaValue(season.metas, "title") ?? season.name?.trim() ?? `Hoofdstuk ${seasonId}`
        titles.set(seasonId, title)
      } catch {
        // Season may be hidden from Article(id) while episodes remain listable.
      }
    })
  )
  return titles
}

async function fetchDescendantEpisodes(
  graphql: AudienceGraphqlOptions,
  ancestorId: number
): Promise<AudienceArticleNode[]> {
  const episodes: AudienceArticleNode[] = []
  let offset = 0

  while (true) {
    const data = await audiencePlayerGraphql<{
      ArticleList?: { items?: AudienceArticleNode[] | null } | null
    }>(graphql, ARTICLE_LIST_EPISODES_QUERY, {
      ancestorId,
      limit: ANCESTOR_EPISODE_PAGE_SIZE,
      offset,
    })

    const page = (data.ArticleList?.items ?? []).filter(
      (item) => typeof item?.id === "number"
    ) as AudienceArticleNode[]
    episodes.push(...page)

    if (page.length < ANCESTOR_EPISODE_PAGE_SIZE) break
    offset += ANCESTOR_EPISODE_PAGE_SIZE
  }

  return episodes
}

async function fetchVathuisChaptersViaAncestorFallback(
  seriesArticleId: number,
  graphql: AudienceGraphqlOptions,
  embedOptions: AudiencePlayerEmbedOptions
): Promise<VathuisChapter[]> {
  const episodes = await fetchDescendantEpisodes(graphql, seriesArticleId)
  if (episodes.length === 0) return []

  const seasonIds = [
    ...new Set(
      episodes
        .map((episode) => episode.parent_id)
        .filter((id): id is number => typeof id === "number" && id > 0)
    ),
  ]
  const seasonTitles = await fetchSeasonTitles(graphql, seasonIds)
  return resolveChaptersFromDescendantEpisodes(episodes, embedOptions, seasonTitles)
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

  const graphql: AudienceGraphqlOptions = { projectId, apiBaseUrl }
  const embedOptions: AudiencePlayerEmbedOptions = {
    projectId,
    previewUrl: options?.embed?.previewUrl ?? null,
    iframeUrl: options?.embed?.iframeUrl ?? null,
  }

  const data = await audiencePlayerGraphql<{ Article?: AudienceArticleNode | null }>(
    graphql,
    ARTICLE_WITH_CHAPTERS_QUERY,
    { articleId }
  )

  const chapters = resolveChapters(data.Article, embedOptions)
  if (chapters.length > 0) return chapters

  return fetchVathuisChaptersViaAncestorFallback(articleId, graphql, embedOptions)
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

  const graphql: AudienceGraphqlOptions = { projectId, apiBaseUrl }
  const embedOptions: AudiencePlayerEmbedOptions = {
    projectId,
    previewUrl: options?.embed?.previewUrl ?? null,
    iframeUrl: options?.embed?.iframeUrl ?? null,
  }

  const data = await audiencePlayerGraphql<{ Article?: AudienceArticleNode | null }>(
    graphql,
    ARTICLE_WITH_CHAPTERS_QUERY,
    { articleId }
  )

  return resolveEpisodeNodes(data.Article).map((node, index) =>
    mapEpisode(node, index, 1, embedOptions)
  )
}
