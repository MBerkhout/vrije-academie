'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { VathuisPlaybackConfig } from '@/lib/commerce/types'
import {
  mountAndPlayAudiencePlayer,
  preloadAudiencePlayer,
  type AudiencePlayerInstance,
} from '@/lib/audience-player/runtime'

import 'video.js/dist/video-js.css'
import 'audienceplayer-embed-player/dist/style.css'

interface AudiencePlayerEmbedProps {
  playback: VathuisPlaybackConfig
  /** Increment after each user-initiated open so play() stays in the click gesture chain. */
  playSignal: number
  className?: string
}

export function AudiencePlayerEmbed({
  playback,
  playSignal,
  className,
}: AudiencePlayerEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<AudiencePlayerInstance | null>(null)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    void preloadAudiencePlayer()
  }, [])

  useLayoutEffect(() => {
    if (!playSignal) return

    const mountTarget = containerRef.current
    if (!mountTarget) return
    const host: HTMLDivElement = mountTarget

    let cancelled = false
    setError(null)

    async function startPlayback() {
      try {
        const player = await mountAndPlayAudiencePlayer(
          host,
          playback,
          playerRef.current,
        )
        if (!cancelled) playerRef.current = player
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Video kon niet worden geladen')
        }
      }
    }

    void startPlayback()

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      // Video.js injects DOM outside React; clear it so unmount does not throw removeChild.
      host.replaceChildren()
    }
  }, [playback, playSignal])

  if (error) {
    return (
      <div
        className={`flex h-full items-center justify-center text-white/70 text-sm px-6 text-center ${className ?? ''}`}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`video-wrapper h-full w-full overflow-hidden [&_.video-js]:!h-full [&_.video-js]:!max-w-full [&_.video-js]:!w-full ${className ?? ''}`}
      data-vjs-player
    />
  )
}
