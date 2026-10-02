import type { VathuisChapter, VathuisEpisode } from '@/lib/commerce/types'

export interface VathuisTrailerRef {
  /** `chapter-episode` key accepted by `GET …/episodes/:key/preview-playback`. */
  episodeKey: string
  episode: VathuisEpisode
}

/** The trailer is the first publicly previewable episode (`preview_available`). */
export function findVathuisTrailer(
  chapters: VathuisChapter[] | undefined,
  episodes: VathuisEpisode[] | undefined,
): VathuisTrailerRef | null {
  for (const chapter of chapters ?? []) {
    const episode = chapter.episodes.find((e) => e.preview_available)
    if (episode) return { episodeKey: `${chapter.number}-${episode.number}`, episode }
  }

  const episode = (episodes ?? []).find((e) => e.preview_available)
  if (!episode) return null
  return { episodeKey: `${episode.chapter_number ?? 1}-${episode.number}`, episode }
}

/**
 * Splits the PDP body so the trailer can sit right after the subtitle (first `textBlock` with a
 * `subtitle`, e.g. the Salesforce Productgroup Subtitle). Without a subtitle block, everything is `after`.
 */
export function splitPdpBodyAfterSubtitle(blocks: unknown[] | undefined): {
  before: unknown[]
  after: unknown[]
} {
  const list = blocks ?? []
  const index = list.findIndex((block) => {
    const b = block as { _type?: string; subtitle?: unknown } | null
    return (
      b?._type === 'textBlock' && typeof b.subtitle === 'string' && b.subtitle.trim().length > 0
    )
  })
  if (index < 0) return { before: [], after: list }
  return { before: list.slice(0, index + 1), after: list.slice(index + 1) }
}
