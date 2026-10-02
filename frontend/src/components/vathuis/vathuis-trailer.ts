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
 * Pulls the subtitle (first `textBlock` with a `subtitle`, e.g. the Salesforce Productgroup Subtitle)
 * out of the PDP body so it can render under the H1. A block that also has a title or content stays
 * in the body without its subtitle; a subtitle-only block is dropped.
 */
export function extractPdpSubtitle(blocks: unknown[] | undefined): {
  subtitle: string | null
  body: unknown[]
} {
  const list = blocks ?? []
  const index = list.findIndex((block) => {
    const b = block as { _type?: string; subtitle?: unknown } | null
    return (
      b?._type === 'textBlock' && typeof b.subtitle === 'string' && b.subtitle.trim().length > 0
    )
  })
  if (index < 0) return { subtitle: null, body: list }

  const found = list[index] as { subtitle: string; title?: unknown; content?: unknown[] }
  const hasOtherContent = Boolean(found.title) || (found.content?.length ?? 0) > 0
  const rest = hasOtherContent
    ? list.map((block, i) => (i === index ? { ...found, subtitle: undefined } : block))
    : list.filter((_, i) => i !== index)
  return { subtitle: found.subtitle.trim(), body: rest }
}
