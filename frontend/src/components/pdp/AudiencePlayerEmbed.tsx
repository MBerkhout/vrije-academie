'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
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
  const containerId = useId().replace(/:/g, '')
  const playerRef = useRef<AudiencePlayerInstance | null>(null)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    void preloadAudiencePlayer()
  }, [])

  useLayoutEffect(() => {
    if (!playSignal) return

    let cancelled = false
    setError(null)

    async function startPlayback() {
      try {
        const container = document.getElementById(containerId)
        if (!container) return

        const player = await mountAndPlayAudiencePlayer(
          container,
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
    }
  }, [containerId, playback, playSignal])

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
      id={containerId}
      className={`video-wrapper h-full w-full overflow-hidden [&_.video-js]:!h-full [&_.video-js]:!max-w-full [&_.video-js]:!w-full ${className ?? ''}`}
      data-vjs-player
    />
  )
}
