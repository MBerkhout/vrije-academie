import { createHash } from "node:crypto"

import { dedupeHandles, normalizeHandle } from "../../../lib/customer-wishlist"

export function favouritesWishlistFingerprint(handles: string[]): string {
  const normalized = dedupeHandles(handles.map((h) => normalizeHandle(h)).filter(Boolean))
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 32)
}
