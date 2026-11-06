import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  buildEventsByHandlesFromSnapshot,
  EVENTS_BY_HANDLES_MAX,
} from "../../../../lib/store-events-by-handles"
import { listingCacheTtlSec } from "../../../../lib/listing-cache-config"

function parseHandleParams(val: string | string[] | undefined): string[] {
  if (!val) return []
  return (Array.isArray(val) ? val : [val])
    .flatMap((v) => v.split(","))
    .map((h) => h.trim())
    .filter(Boolean)
}

function setListingCacheHeaders(res: MedusaResponse): void {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${listingCacheTtlSec()}, stale-while-revalidate=${listingCacheTtlSec()}`
  )
}

/**
 * GET /store/events/by-handles?handle=a&handle=b
 * PLP-shaped cards from the listing snapshot in request order (max 8 handles).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const q = req.query
  const fromBracket = parseHandleParams(q.handle as string | string[] | undefined)
  const handles = fromBracket.slice(0, EVENTS_BY_HANDLES_MAX)

  if (!handles.length) {
    res.status(400).json({ message: "At least one handle query param is required." })
    return
  }

  const events = await buildEventsByHandlesFromSnapshot(req.scope, handles)
  setListingCacheHeaders(res)
  res.json({ events })
}
