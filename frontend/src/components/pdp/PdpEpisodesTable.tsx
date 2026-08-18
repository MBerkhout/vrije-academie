'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { VathuisChapter, VathuisEpisode, VathuisPlaybackConfig } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import { preloadAudiencePlayer } from '@/lib/audience-player/runtime'
import { commerceClient } from '@/lib/commerce'
import { useVathuisAccess } from '@/lib/commerce/use-vathuis-access'
import { defaultMessages } from '@/lib/i18n/messages'
import { formatDateShort } from '@/lib/locale-format'
import { Button } from '@/components/ui/Button'
import { PdpEpisodePreviewModal } from '@/components/pdp/PdpEpisodePreviewModal'
import { cn } from '@/lib/utils'

interface PdpEpisodesTableProps {
  productHandle: string
  chapters?: VathuisChapter[]
  episodes: VathuisEpisode[]
  chapterTitle?: string | null
  settings?: GeneralSettings | null
  variant?: 'light' | 'dark'
}

type PlaylistItem = {
  chapterNumber: number
  episode: VathuisEpisode
}

function scrollToBookingPanel() {
  document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function episodeKey(chapterNumber: number, episodeNumber: number): string {
  return `${chapterNumber}-${episodeNumber}`
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function PdpEpisodesTable({
  productHandle,
  chapters = [],
  episodes,
  chapterTitle,
  settings,
  variant = 'light',
}: PdpEpisodesTableProps) {
  const labels = settings?.pdp?.labels
  const t = defaultMessages.pdp
  const { access: vathuisAccess } = useVathuisAccess(productHandle)
  const hasPurchasedAccess = Boolean(vathuisAccess.hasAccess)
  const accessExpiresAt = vathuisAccess.expiresAt

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
  const [playback, setPlayback] = useState<VathuisPlaybackConfig | null>(null)
  const [playSignal, setPlaySignal] = useState(0)
  const [playlistIndex, setPlaylistIndex] = useState<number | null>(null)
  const [loadingEpisodeKey, setLoadingEpisodeKey] = useState<string | null>(null)
  const previewPlaybackCache = useRef(new Map<string, VathuisPlaybackConfig>())

  useEffect(() => {
    void preloadAudiencePlayer()
  }, [])

  const canWatchEpisode = useCallback(
    (episode: VathuisEpisode) => Boolean(episode.preview_available) || hasPurchasedAccess,
    [hasPurchasedAccess],
  )

  const playlist = useMemo(() => {
    const items: PlaylistItem[] = []
    for (const chapter of resolvedChapters) {
      for (const episode of chapter.episodes) {
        if (canWatchEpisode(episode)) {
          items.push({ chapterNumber: chapter.number, episode })
        }
      }
    }
    return items
  }, [resolvedChapters, canWatchEpisode])

  useEffect(() => {
    for (const item of playlist) {
      if (!item.episode.preview_available) continue
      const key = episodeKey(item.chapterNumber, item.episode.number)
      if (previewPlaybackCache.current.has(key)) continue
      void commerceClient.getVathuisPreviewPlayback(productHandle, key).then((config) => {
        if (config) previewPlaybackCache.current.set(key, config)
      })
    }
  }, [playlist, productHandle])

  const selectedChapter =
    resolvedChapters.find((chapter) => chapter.number === selectedChapterNumber) ??
    resolvedChapters[0]

  const selectedChapterIndex = resolvedChapters.findIndex(
    (chapter) => chapter.number === selectedChapter?.number,
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

  const resolveEpisodePlayback = useCallback(
    async (item: PlaylistItem): Promise<VathuisPlaybackConfig | null> => {
      const key = episodeKey(item.chapterNumber, item.episode.number)

      if (item.episode.preview_available) {
        return (
          previewPlaybackCache.current.get(key) ??
          (await commerceClient.getVathuisPreviewPlayback(productHandle, key))
        )
      }

      if (!hasPurchasedAccess) return null
      return commerceClient.getVathuisEpisodePlayback(productHandle, key)
    },
    [hasPurchasedAccess, productHandle],
  )

  const openPlaylistItem = useCallback(
    async (index: number) => {
      const item = playlist[index]
      if (!item) return

      setPlaylistIndex(index)
      setSelectedChapterNumber(item.chapterNumber)
      setPreviewEpisode(item.episode)
      setPlayback(null)
      setPlaySignal(0)

      const key = episodeKey(item.chapterNumber, item.episode.number)
      setLoadingEpisodeKey(key)
      try {
        const resolvedPlayback = await resolveEpisodePlayback(item)
        if (resolvedPlayback) {
          if (item.episode.preview_available) {
            previewPlaybackCache.current.set(key, resolvedPlayback)
          }
          flushSync(() => {
            setPlayback(resolvedPlayback)
            setPlaySignal((current) => current + 1)
          })
        }
      } finally {
        setLoadingEpisodeKey(null)
      }
    },
    [playlist, resolveEpisodePlayback],
  )

  async function handleWatchEpisode(episode: VathuisEpisode, chapterNumber: number) {
    if (!canWatchEpisode(episode)) {
      scrollToBookingPanel()
      return
    }

    const index = playlist.findIndex(
      (item) => item.chapterNumber === chapterNumber && item.episode.number === episode.number,
    )
    if (index < 0) return
    await openPlaylistItem(index)
  }

  async function goToPlaylistOffset(offset: number) {
    if (playlistIndex == null) return
    const nextIndex = playlistIndex + offset
    if (nextIndex < 0 || nextIndex >= playlist.length) return
    await openPlaylistItem(nextIndex)
  }

  function closePreview() {
    setPreviewEpisode(null)
    setPlayback(null)
    setPlaySignal(0)
    setPlaylistIndex(null)
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

  const accessNote =
    hasPurchasedAccess && accessExpiresAt
      ? (t.episodesAccessUntil ?? 'Toegang tot {date}').replace(
          '{date}',
          formatDateShort(accessExpiresAt),
        )
      : null

  const showModalNavigation = hasPurchasedAccess && playlist.length > 1
  const hasPreviousEpisode = playlistIndex != null && playlistIndex > 0
  const hasNextEpisode = playlistIndex != null && playlistIndex < playlist.length - 1

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
            <div className="relative">
              <select
                id="pdp-chapter-select"
                value={selectedChapter.number}
                onChange={(e) => setSelectedChapterNumber(Number(e.target.value))}
                className={cn(
                  'w-full border px-4 py-3 pr-10 text-sm font-semibold uppercase tracking-wide appearance-none cursor-pointer',
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
              <ChevronDownIcon
                className={cn(
                  'pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2',
                  isDark ? 'text-white' : 'text-va-black',
                )}
              />
            </div>
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

        {accessNote ? (
          <p className={cn('mb-4 text-sm', mutedClass)}>{accessNote}</p>
        ) : null}

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
              {selectedChapter.episodes.map((episode) => {
                const key = episodeKey(selectedChapter.number, episode.number)
                const watchable = canWatchEpisode(episode)
                const loading = loadingEpisodeKey === key

                return (
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
                      {watchable ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="uppercase tracking-wide text-xs"
                          disabled={loading}
                          onClick={() => void handleWatchEpisode(episode, selectedChapter.number)}
                        >
                          {loading ? '…' : watchLabel}
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
                )
              })}
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
        playback={playback}
        playSignal={playSignal}
        productHandle={productHandle}
        productTitle={chapterTitle ?? undefined}
        open={previewEpisode != null}
        onClose={closePreview}
        showNavigation={showModalNavigation}
        hasPrevious={hasPreviousEpisode}
        hasNext={hasNextEpisode}
        onPrevious={() => void goToPlaylistOffset(-1)}
        onNext={() => void goToPlaylistOffset(1)}
        loadingNavigation={loadingEpisodeKey != null}
      />
    </>
  )
}
