import type { VathuisEpisode } from "../modules/salesforce-sync/clients/audience-player"

export type VathuisMetadataShape = {
  episodes?: VathuisEpisode[]
  chapters?: Array<{ number: number; episodes: VathuisEpisode[] }>
  audience_player?: {
    project_id?: number | null
    preview_url?: string | null
    iframe_url?: string | null
  } | null
}

export function parseEpisodeKey(
  episodeKey: string
): { chapterNumber: number; episodeNumber: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(episodeKey.trim())
  if (!match) return null
  const chapterNumber = Number(match[1])
  const episodeNumber = Number(match[2])
  if (!Number.isFinite(chapterNumber) || !Number.isFinite(episodeNumber)) return null
  if (chapterNumber < 1 || episodeNumber < 1) return null
  return { chapterNumber, episodeNumber }
}

export function buildEpisodeKey(chapterNumber: number, episodeNumber: number): string {
  return `${chapterNumber}-${episodeNumber}`
}

export function findVathuisEpisode(
  vathuis: VathuisMetadataShape | null | undefined,
  chapterNumber: number,
  episodeNumber: number
): VathuisEpisode | null {
  if (!vathuis) return null

  const chapters = Array.isArray(vathuis.chapters) ? vathuis.chapters : []
  const chapter = chapters.find((c) => c.number === chapterNumber)
  if (chapter?.episodes?.length) {
    const ep = chapter.episodes.find((e) => e.number === episodeNumber)
    if (ep) return ep
  }

  const flat = Array.isArray(vathuis.episodes) ? vathuis.episodes : []
  return (
    flat.find(
      (e) =>
        e.number === episodeNumber &&
        (e.chapter_number == null || e.chapter_number === chapterNumber)
    ) ?? null
  )
}

export function stripNonPreviewEmbedUrls<T extends { preview_available?: boolean; embed_url?: string | null }>(
  episodes: T[]
): T[] {
  return episodes.map((episode) =>
    episode.preview_available
      ? episode
      : { ...episode, embed_url: null }
  )
}

export function stripVathuisPublicEmbeds(
  vathuis: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (!vathuis || typeof vathuis !== "object") return vathuis

  const episodes = Array.isArray(vathuis.episodes)
    ? stripNonPreviewEmbedUrls(vathuis.episodes as VathuisEpisode[])
    : vathuis.episodes

  const chapters = Array.isArray(vathuis.chapters)
    ? (vathuis.chapters as Array<Record<string, unknown>>).map((chapter) => ({
        ...chapter,
        episodes: Array.isArray(chapter.episodes)
          ? stripNonPreviewEmbedUrls(chapter.episodes as VathuisEpisode[])
          : chapter.episodes,
      }))
    : vathuis.chapters

  return { ...vathuis, episodes, chapters }
}
