import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { VATHUIS_ACCESS_MODULE } from "../../../../../../../../../modules/vathuis-access"
import type VathuisAccessModuleService from "../../../../../../../../../modules/vathuis-access/service"

/**
 * GET /store/customer/me/vathuis-access/:handle/episodes/:episodeKey/embed
 * Returns Audience Player playback config (token + article/asset ids).
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context.actor_id
  const handle = req.params.handle as string
  const episodeKey = req.params.episodeKey as string
  const vathuisAccess = req.scope.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >

  const playback = await vathuisAccess.resolvePlaybackConfig(
    req.scope,
    customerId,
    handle,
    episodeKey
  )
  res.json({ playback })
}
