'use client'

import { useMemo, useState } from 'react'
import type { VathuisChapter, VathuisEpisode } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import { defaultMessages } from '@/lib/i18n/messages'
import { Button } from '@/components/ui/Button'
import { PdpEpisodePreviewModal } from '@/components/pdp/PdpEpisodePreviewModal'

interface PdpEpisodesTableProps {
  chapters?: VathuisChapter[]
  episodes: VathuisEpisode[]
  chapterTitle?: string | null
  settings?: GeneralSettings | null
}

function scrollToBookingPanel() {
  document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function PdpEpisodesTable({
  chapters = [],
  episodes,
  chapterTitle,
  settings,
}: PdpEpisodesTableProps) {
  const labels = settings?.pdp?.labels
  const t = defaultMessages.pdp

  const resolvedChapters = useMemo(() => {
    if (chapters.length > 0) return chapters
    if (!episodes.length) return []
    return [
      {
        number: 1,
        title: chapterTitle ?? t.episodesDefaultChapter ?? 'Hoofdstuk 1',
        episodes,
      },
    ]
  }, [chapters, episodes, chapterTitle, t.episodesDefaultChapter])

  const [selectedChapterNumber, setSelectedChapterNumber] = useState(
    () => resolvedChapters[0]?.number ?? 1,
  )
  const [previewEpisode, setPreviewEpisode] = useState<VathuisEpisode | null>(null)

  const selectedChapter =
    resolvedChapters.find((chapter) => chapter.number === selectedChapterNumber) ??
    resolvedChapters[0]

  if (!selectedChapter?.episodes.length) return null

  const heading = labels?.episodesHeading ?? t.episodesHeading ?? 'Lessen'
  const chapterLabel = labels?.chapterLabel ?? t.episodesChapterLabel ?? 'Hoofdstuk'
  const episodeCol = labels?.episodeColumn ?? t.episodesEpisodeColumn ?? 'Aflevering'
  const durationCol = labels?.durationColumn ?? t.episodesDurationColumn ?? 'Duur'
  const descriptionCol = labels?.descriptionColumn ?? t.episodesDescriptionColumn ?? 'Beschrijving'
  const watchLabel = labels?.watchEpisode ?? t.episodesWatchEpisode ?? 'Bekijk aflevering'
  const buyLabel = labels?.bundleCta ?? t.episodesBuyAll ?? 'Koop alle lessen'

  return (
    <>
      <section id="afleveringen" className="py-8">
        {resolvedChapters.length > 1 ? (
          <div className="mb-4 max-w-md">
            <label
              htmlFor="pdp-chapter-select"
              className="block text-sm uppercase tracking-wide text-va-gray mb-2"
            >
              {chapterLabel}:
            </label>
            <select
              id="pdp-chapter-select"
              value={selectedChapter.number}
              onChange={(e) => setSelectedChapterNumber(Number(e.target.value))}
              className="w-full border border-va-lightgray bg-va-yellow px-4 py-3 text-sm font-semibold text-va-black uppercase tracking-wide appearance-none cursor-pointer"
            >
              {resolvedChapters.map((chapter) => (
                <option key={chapter.number} value={chapter.number}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm uppercase tracking-wide text-va-gray mb-2">
            {chapterLabel}: {selectedChapter.title}
          </p>
        )}

        <h2 className="font-serif text-2xl font-bold text-va-black mb-4">{heading}</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-va-lightgray text-va-gray text-xs uppercase tracking-wide">
                <th className="text-left py-3 pr-4 font-medium">{episodeCol}</th>
                <th className="text-left py-3 pr-4 font-medium">{durationCol}</th>
                <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">
                  {descriptionCol}
                </th>
                <th className="text-right py-3 font-medium w-44" aria-label="Actie" />
              </tr>
            </thead>
            <tbody>
              {selectedChapter.episodes.map((episode) => (
                <tr
                  key={`${selectedChapter.number}-${episode.number}-${episode.audience_article_id ?? episode.title}`}
                  className="border-b border-va-lightgray/60"
                >
                  <td className="py-4 pr-4 align-top">
                    <span className="font-semibold text-va-black">
                      {episode.number}. {episode.title}
                    </span>
                  </td>
                  <td className="py-4 pr-4 align-top text-va-gray whitespace-nowrap">
                    {episode.duration_label ? `${episode.duration_label} minuten` : '—'}
                  </td>
                  <td className="py-4 pr-4 align-top text-va-gray hidden md:table-cell">
                    {episode.description ?? '—'}
                  </td>
                  <td className="py-4 align-top text-right whitespace-nowrap">
                    {episode.preview_available ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="uppercase tracking-wide text-xs"
                        onClick={() => setPreviewEpisode(episode)}
                      >
                        {watchLabel}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="uppercase tracking-wide text-xs opacity-80"
                        onClick={scrollToBookingPanel}
                      >
                        {buyLabel}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-va-gray md:hidden">
          {t.episodesBundleNote ?? 'Alle afleveringen zijn inbegrepen bij aankoop van de reeks.'}
        </p>
      </section>

      <PdpEpisodePreviewModal
        episode={previewEpisode}
        open={previewEpisode != null}
        onClose={() => setPreviewEpisode(null)}
      />
    </>
  )
}
