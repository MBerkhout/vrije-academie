'use client'

import { useMemo, useState } from 'react'
import type { VathuisChapter, VathuisEpisode } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import { defaultMessages } from '@/lib/i18n/messages'
import { Button } from '@/components/ui/Button'
import { PdpEpisodePreviewModal } from '@/components/pdp/PdpEpisodePreviewModal'
import { cn } from '@/lib/utils'

interface PdpEpisodesTableProps {
  chapters?: VathuisChapter[]
  episodes: VathuisEpisode[]
  chapterTitle?: string | null
  settings?: GeneralSettings | null
  variant?: 'light' | 'dark'
}

function scrollToBookingPanel() {
  document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function PdpEpisodesTable({
  chapters = [],
  episodes,
  chapterTitle,
  settings,
  variant = 'light',
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

  const selectedChapterIndex = resolvedChapters.findIndex(
    (chapter) => chapter.number === selectedChapter?.number
  )
  const hasPreviousChapter = selectedChapterIndex > 0
  const hasNextChapter =
    selectedChapterIndex >= 0 && selectedChapterIndex < resolvedChapters.length - 1

  function goToPreviousChapter() {
    if (!hasPreviousChapter) return
    setSelectedChapterNumber(resolvedChapters[selectedChapterIndex - 1].number)
  }

  function goToNextChapter() {
    if (!hasNextChapter) return
    setSelectedChapterNumber(resolvedChapters[selectedChapterIndex + 1].number)
  }

  if (!selectedChapter?.episodes.length) return null

  const isDark = variant === 'dark'
  const headingClass = isDark ? 'text-white' : 'text-va-black'
  const mutedClass = isDark ? 'text-va-gray-300' : 'text-va-gray'
  const borderClass = isDark ? 'border-va-darkgray-700' : 'border-va-lightgray'
  const rowBorderClass = isDark ? 'border-va-darkgray-800' : 'border-va-lightgray/60'
  const cellTitleClass = isDark ? 'text-white' : 'text-va-black'
  const chapterNavClass =
    'inline-flex items-center gap-2 text-sm font-semibold text-va-yellow hover:text-va-yellow/80 transition-colors disabled:opacity-40 disabled:pointer-events-none'

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
        {resolvedChapters.length > 1 && (
          <div className="mb-4 max-w-md">
            <label
              htmlFor="pdp-chapter-select"
              className={cn('block text-sm uppercase tracking-wide mb-2', mutedClass)}
            >
              {chapterLabel}:
            </label>
            <select
              id="pdp-chapter-select"
              value={selectedChapter.number}
              onChange={(e) => setSelectedChapterNumber(Number(e.target.value))}
              className={cn(
                'w-full border px-4 py-3 text-sm font-semibold uppercase tracking-wide appearance-none cursor-pointer',
                isDark
                  ? 'border-va-darkgray-600 bg-va-darkgray-900 text-white'
                  : 'border-va-lightgray bg-va-yellow text-va-black',
              )}
            >
              {resolvedChapters.map((chapter) => (
                <option key={chapter.number} value={chapter.number}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {resolvedChapters.length > 1 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={goToPreviousChapter}
              disabled={!hasPreviousChapter}
              className={chapterNavClass}
            >
              ← Vorig hoofdstuk bekijken
            </button>
          </div>
        )}

        <h2 className={cn('font-sans text-2xl font-bold mb-4', headingClass)}>{heading}</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn('border-b text-xs uppercase tracking-wide', borderClass, mutedClass)}>
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
                  className={cn('border-b', rowBorderClass)}
                >
                  <td className="py-4 pr-4 align-top">
                    <span className={cn('font-semibold', cellTitleClass)}>
                      {episode.number}. {episode.title}
                    </span>
                  </td>
                  <td className={cn('py-4 pr-4 align-top whitespace-nowrap', mutedClass)}>
                    {episode.duration_label ? `${episode.duration_label} minuten` : '—'}
                  </td>
                  <td className={cn('py-4 pr-4 align-top hidden md:table-cell', mutedClass)}>
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

        {resolvedChapters.length > 1 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={goToNextChapter}
              disabled={!hasNextChapter}
              className={chapterNavClass}
            >
              Volgend hoofdstuk bekijken →
            </button>
          </div>
        )}

        <p className={cn('mt-4 text-sm md:hidden', mutedClass)}>
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
