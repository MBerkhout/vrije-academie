'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { VathuisEpisode } from '@/lib/commerce/types'
import {
  trackVideoComplete,
  trackVideoProgress,
  trackVideoStart,
} from '@/lib/analytics/events/ecommerce'
import { defaultMessages } from '@/lib/i18n/messages'
import { Button } from '@/components/ui/Button'

interface PdpEpisodePreviewModalProps {
  episode: VathuisEpisode | null
  productHandle?: string
  productTitle?: string
  open: boolean
  onClose: () => void
  showNavigation?: boolean
  hasPrevious?: boolean
  hasNext?: boolean
  onPrevious?: () => void
  onNext?: () => void
  loadingNavigation?: boolean
}

export function PdpEpisodePreviewModal({
  episode,
  productHandle,
  productTitle,
  open,
  onClose,
  showNavigation = false,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  loadingNavigation = false,
}: PdpEpisodePreviewModalProps) {
  const t = defaultMessages.pdp
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !episode?.embed_url || !productHandle) return
    const itemName = productTitle ?? episode.title
    trackVideoStart(productHandle, itemName, 'vimeo')
    const duration = episode.duration_seconds ?? 0
    const milestones = new Set<number>()
    const started = Date.now()
    const interval = window.setInterval(() => {
      if (duration <= 0) return
      const pct = Math.round(((Date.now() - started) / 1000 / duration) * 100)
      for (const milestone of [25, 50, 75, 90]) {
        if (pct >= milestone && !milestones.has(milestone)) {
          milestones.add(milestone)
          trackVideoProgress(productHandle, milestone)
        }
      }
      if (pct >= 98) {
        trackVideoComplete(productHandle)
        window.clearInterval(interval)
      }
    }, 5000)
    return () => window.clearInterval(interval)
  }, [open, episode, productHandle, productTitle])

  if (!open || !episode) return null

  const embedUrl = episode.embed_url
  const previousLabel = t.episodePrevious ?? 'Vorige aflevering'
  const nextLabel = t.episodeNext ?? 'Volgende aflevering'

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-4xl bg-va-black rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/10">
          <h2 id={titleId} className="text-white font-sans text-lg font-semibold truncate">
            {episode.number}. {episode.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-white/80 hover:text-white text-sm uppercase tracking-wide"
            aria-label={t.episodePreviewClose ?? 'Sluiten'}
          >
            {t.episodePreviewClose ?? 'Sluiten'}
          </button>
        </div>

        <div className="aspect-video bg-black">
          {embedUrl ? (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={`${episode.title} preview`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/70 text-sm px-6 text-center">
              {loadingNavigation
                ? (t.episodeLoading ?? 'Aflevering laden…')
                : (t.episodePreviewUnavailable ?? 'Deze preview is momenteel niet beschikbaar.')}
            </div>
          )}
        </div>

        {showNavigation ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="uppercase tracking-wide text-xs"
              disabled={!hasPrevious || loadingNavigation}
              onClick={onPrevious}
            >
              ← {previousLabel}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="uppercase tracking-wide text-xs"
              disabled={!hasNext || loadingNavigation}
              onClick={onNext}
            >
              {nextLabel} →
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
