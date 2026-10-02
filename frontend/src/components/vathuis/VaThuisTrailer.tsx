'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { VathuisPlaybackConfig } from '@/lib/commerce/types'
import { commerceClient } from '@/lib/commerce'
import { preloadAudiencePlayer } from '@/lib/audience-player/runtime'
import { trackVideoStart } from '@/lib/analytics/events/ecommerce'
import { AudiencePlayerEmbed } from '@/components/pdp/AudiencePlayerEmbed'

interface VaThuisTrailerProps {
  productHandle: string
  productTitle: string
  /** `chapter-episode` key of the preview episode. */
  episodeKey: string
  posterUrl?: string | null
}

/** Inline trailer (preview episode) for the VAthuis PDP: poster + play button, then the Audience Player. */
export function VaThuisTrailer({
  productHandle,
  productTitle,
  episodeKey,
  posterUrl,
}: VaThuisTrailerProps) {
  const [playback, setPlayback] = useState<VathuisPlaybackConfig | null>(null)
  const [playSignal, setPlaySignal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  // Prefetch so the click can start playback inside the user gesture.
  useEffect(() => {
    let cancelled = false
    void preloadAudiencePlayer()
    void commerceClient.getVathuisPreviewPlayback(productHandle, episodeKey).then((config) => {
      if (!cancelled && config) setPlayback(config)
    })
    return () => {
      cancelled = true
    }
  }, [productHandle, episodeKey])

  async function handlePlay() {
    setUnavailable(false)
    let config = playback
    if (!config) {
      setLoading(true)
      config = await commerceClient.getVathuisPreviewPlayback(productHandle, episodeKey)
      setLoading(false)
    }
    if (!config) {
      setUnavailable(true)
      return
    }
    const resolved = config
    flushSync(() => {
      setPlayback(resolved)
      setPlaySignal((current) => current + 1)
    })
    trackVideoStart(productHandle, productTitle, 'vimeo')
  }

  return (
    <div className="mb-6 relative aspect-video w-full overflow-hidden bg-black">
      {playback && playSignal > 0 ? (
        <AudiencePlayerEmbed
          key={`${playback.articleId}-${playback.assetId}`}
          playback={playback}
          playSignal={playSignal}
        />
      ) : (
        <>
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover opacity-80"
            />
          ) : null}
          <button
            type="button"
            onClick={() => void handlePlay()}
            disabled={loading}
            aria-label={`Trailer van ${productTitle} afspelen`}
            className="absolute inset-0 flex items-center justify-center group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-va-yellow"
          >
            <span className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full bg-va-yellow text-va-black shadow-lg transition-transform group-hover:scale-105 group-disabled:opacity-70">
              <svg className="ml-1 h-7 w-7 md:h-9 md:w-9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
          {unavailable ? (
            <p className="absolute inset-x-0 bottom-3 px-4 text-center text-sm text-white/80">
              De trailer is momenteel niet beschikbaar.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
