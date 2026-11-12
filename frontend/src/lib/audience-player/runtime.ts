import type { VathuisPlaybackConfig } from '@/lib/commerce/types'

type AudiencePlayerModules = {
  videojs: typeof import('video.js').default
  EmbedPlayer: typeof import('audienceplayer-embed-player').EmbedPlayer
}

export type AudiencePlayerInstance = {
  destroy: () => void
}

function disposeVideoJsInContainer(
  videojs: typeof import('video.js').default,
  container: HTMLElement
): void {
  const el = container.querySelector('.video-js,video')
  if (!el) return
  try {
    const player = videojs.getPlayer(el)
    if (player && !player.isDisposed()) {
      player.off('error')
      player.dispose()
    }
  } catch {
    // Player may already be torn down by embed-player / React unmount.
  }
}

let modulesPromise: Promise<AudiencePlayerModules> | null = null

/** Preload video.js + embed-player so play() can run soon after a user click. */
export function preloadAudiencePlayer(): Promise<AudiencePlayerModules> {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import('video.js').then((mod) => mod.default),
      import('videojs-contrib-eme'),
      import('audienceplayer-embed-player').then((mod) => mod.EmbedPlayer),
    ]).then(([videojs, _, EmbedPlayer]) => ({ videojs, EmbedPlayer }))
  }
  return modulesPromise
}

export async function mountAndPlayAudiencePlayer(
  container: HTMLElement,
  playback: VathuisPlaybackConfig,
  existingPlayer?: AudiencePlayerInstance | null,
): Promise<AudiencePlayerInstance> {
  existingPlayer?.destroy()

  const { videojs, EmbedPlayer } = await preloadAudiencePlayer()

  const embedPlayer = new EmbedPlayer(videojs, {
    apiBaseUrl: playback.apiBaseUrl,
    projectId: playback.projectId,
    chromecastReceiverAppId: '',
  })

  embedPlayer.initVideoPlayer({
    selector: container,
    options: { autoplay: true },
  })

  await embedPlayer.play({
    articleId: playback.articleId,
    assetId: playback.assetId,
    token: playback.token,
    continueFromPreviousPosition: true,
  })

  const upstreamDestroy =
    typeof (embedPlayer as { destroy?: () => void }).destroy === 'function'
      ? () => (embedPlayer as { destroy: () => void }).destroy()
      : null

  return {
    destroy() {
      disposeVideoJsInContainer(videojs, container)
      upstreamDestroy?.()
    },
  }
}
