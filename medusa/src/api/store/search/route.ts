import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SearchModuleService from "../../../modules/search/service"

function setSearchCacheHeaders(res: MedusaResponse): void {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
}

/**
 * GET /store/search — typo-tolerant unified site search (OpenSearch).
 * Query: q (required), mode=suggest|full (default full).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
  const mode = typeof req.query.mode === "string" ? req.query.mode : "full"

  if (!q || q.length < 2) {
    if (mode === "suggest") {
      res.json({ products: [], categories: [], places: [], pages: [] })
    } else {
      res.json({ hits: [], count: 0 })
    }
    return
  }

  const search = req.scope.resolve("search") as InstanceType<typeof SearchModuleService>

  if (!search.isEnabled()) {
    res.status(503).json({ message: "Search not configured" })
    return
  }

  try {
    if (mode === "suggest") {
      const result = await search.searchSuggest(q)
      setSearchCacheHeaders(res)
      res.json(result)
      return
    }

    const result = await search.searchSite(q)
    setSearchCacheHeaders(res)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: "Search failed", detail: String(err) })
  }
}
