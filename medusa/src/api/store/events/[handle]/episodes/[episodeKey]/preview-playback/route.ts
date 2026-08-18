import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolvePreviewAudiencePlayerPlayback } from "../../../../../../../lib/audience-player/client"
import {
  episodePlaybackIds,
  loadVathuisEpisodeByKey,
} from "../../../../../../../lib/vathuis-playback"

/**
 * GET /store/events/:handle/episodes/:episodeKey/preview-playback
 * SDK playback config for episodes with preview_available.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle as string
  const episodeKey = req.params.episodeKey as string

  const { vathuis, episode } = await loadVathuisEpisodeByKey(req.scope, handle, episodeKey)
  if (!episode.preview_available) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Episode preview is not available"
    )
  }

  const ids = episodePlaybackIds(episode, vathuis)
  const playback = await resolvePreviewAudiencePlayerPlayback({
    articleId: ids.articleId,
    assetId: ids.assetId,
    projectId: ids.projectId,
  })

  res.json({ playback })
}
