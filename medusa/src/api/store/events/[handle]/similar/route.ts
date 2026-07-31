import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { buildSimilarEventsFromSnapshot } from "../../../../../lib/store-similar-events"
import { EVENT_CACHE_TTL_SEC } from "../../../../../lib/store-listing-redis"

function setSimilarCacheHeaders(res: MedusaResponse): void {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${EVENT_CACHE_TTL_SEC}, stale-while-revalidate=${EVENT_CACHE_TTL_SEC}`
  )
}

/**
 * GET /store/events/:handle/similar
 * Up to 4 related products in the same catalog category, sorted by registrations when available.
 * Uses the PLP listing snapshot (Redis) instead of per-sibling Postgres graph loads.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { handle },
  })

  if (!products?.[0]) {
    res.status(404).json({ message: "Event not found" })
    return
  }

  const similar = await buildSimilarEventsFromSnapshot(req.scope, handle)
  setSimilarCacheHeaders(res)
  res.json({ similar })
}
