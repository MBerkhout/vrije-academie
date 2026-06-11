'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { VathuisEpisode } from '@/lib/commerce/types'
import { defaultMessages } from '@/lib/i18n/messages'

interface PdpEpisodePreviewModalProps {
  episode: VathuisEpisode | null
  open: boolean
  onClose: () => void
}

export function PdpEpisodePreviewModal({ episode, open, onClose }: PdpEpisodePreviewModalProps) {
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

  if (!open || !episode) return null

  const embedUrl = episode.embed_url

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
              src={embedUrl}
              title={`${episode.title} preview`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/70 text-sm px-6 text-center">
              {t.episodePreviewUnavailable ?? 'Deze preview is momenteel niet beschikbaar.'}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
