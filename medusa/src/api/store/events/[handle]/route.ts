import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { EVENT_CACHE_TTL_SEC } from "../../../../lib/store-listing-redis"
import { getCachedStoreEventDetail } from "../../../../lib/store-event-detail"

function setEventDetailCacheHeaders(res: MedusaResponse): void {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${EVENT_CACHE_TTL_SEC}, stale-while-revalidate=${EVENT_CACHE_TTL_SEC}`
  )
}

/**
 * GET /store/events/:handle
 * Full Product Group enriched with EventGroup, variants, EventItems, categories, instructors,
 * images, tags, prices, and computed group-level fields.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle as string
  const enriched = await getCachedStoreEventDetail(req.scope, handle)

  if (!enriched) {
    res.status(404).json({ message: "Event not found" })
    return
  }

  setEventDetailCacheHeaders(res)
  res.json({ event: enriched })
}
