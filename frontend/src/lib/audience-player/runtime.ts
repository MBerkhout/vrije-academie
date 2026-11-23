import type { VathuisPlaybackConfig } from '@/lib/commerce/types'

type AudiencePlayerModules = {
  videojs: typeof import('video.js').default
  EmbedPlayer: typeof import('audienceplayer-embed-player').EmbedPlayer
}

export type AudiencePlayerInstance = {
  destroy: () => void
}

/** video.js / embed-player can throw if stop/destroy runs after the tech element is gone. */
function isKnownPlayerTeardownError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message
  return (
    /reading 'ended'/.test(msg) ||
    /evaluating 'this\.el_/.test(msg) ||
    /Cannot read properties of null/.test(msg)
  )
}

function safeCall(fn: (() => void) | null): void {
  if (!fn) return
  try {
    fn()
  } catch (error) {
    if (!isKnownPlayerTeardownError(error)) throw error
  }
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
      // Drop every listener first so late EME / async callbacks cannot touch a disposed player.
      ;(player as unknown as { off: () => void }).off()
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

  let destroyed = false

  return {
    destroy() {
      if (destroyed) return
      destroyed = true
      // Upstream stop() must run before video.js dispose(); reverse order caused Sentry FRONTEND-15/16.
      safeCall(upstreamDestroy)
      safeCall(() => disposeVideoJsInContainer(videojs, container))
    },
  }
}
