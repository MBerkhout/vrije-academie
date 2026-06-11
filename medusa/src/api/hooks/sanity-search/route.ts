import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as crypto from "node:crypto"

import SearchModuleService from "../../../modules/search/service"

function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8")
    const bb = Buffer.from(b, "utf8")
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

type SanityWebhookBody = {
  ids?: {
    created?: string[]
    updated?: string[]
    deleted?: string[]
  }
  /** Single-document fallback payload. */
  _id?: string
  operation?: "create" | "update" | "delete"
}

/** POST /hooks/sanity-search — index Sanity page/person docs into OpenSearch. */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const secret = process.env.SANITY_SEARCH_WEBHOOK_SECRET?.trim()
  if (!secret) {
    res.status(503).json({ message: "SANITY_SEARCH_WEBHOOK_SECRET not configured" })
    return
  }

  const hdr = req.headers["x-sanity-search-webhook-secret"]
  const sent = typeof hdr === "string" ? hdr : Array.isArray(hdr) ? hdr[0] : ""
  if (!timingSafeEqualString(sent, secret)) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const search = req.scope.resolve("search") as InstanceType<typeof SearchModuleService>
  if (!search.isEnabled()) {
    res.status(503).json({ message: "OpenSearch not configured" })
    return
  }

  const body = (req.body ?? {}) as SanityWebhookBody
  const ids = new Set<string>()

  for (const group of [
    body.ids?.created ?? [],
    body.ids?.updated ?? [],
    body.ids?.deleted ?? [],
  ]) {
    for (const id of group) {
      if (id && !id.startsWith("drafts.")) ids.add(id)
    }
  }

  if (body._id && !body._id.startsWith("drafts.")) {
    ids.add(body._id)
  }

  const deleted = new Set(body.ids?.deleted ?? [])
  if (body.operation === "delete" && body._id) {
    deleted.add(body._id)
  }

  for (const id of ids) {
    if (deleted.has(id)) {
      await search.deleteSanityDocById(id)
    } else {
      await search.upsertSanityDocById(id)
    }
  }

  res.json({ ok: true, processed: ids.size })
}
