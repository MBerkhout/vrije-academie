import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { listPublishedProductHandleSet } from "../../../../lib/store-published-handles"

/**
 * GET /store/events/published-handles
 * Lightweight set of published product handles for storefront sitemap filtering.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const handles = await listPublishedProductHandleSet(req.scope)
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
  res.json({ handles: [...handles] })
}
