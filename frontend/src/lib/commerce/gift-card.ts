/**
 * Gift card redemption metadata stored on Medusa cart.metadata (mirrors backend).
 */
export type GiftCardRedemptionMeta = {
  code: string
  gift_card_id: string
}

export function parseGiftCardRedemptions(
  metadata: Record<string, unknown> | null | undefined
): GiftCardRedemptionMeta[] {
  const raw = metadata?.gift_card_redemptions
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) => r as GiftCardRedemptionMeta)
    .filter((r) => typeof r.code === "string" && typeof r.gift_card_id === "string")
}

export type AppliedDiscountEntry =
  | { kind: "promo"; code: string; is_automatic?: boolean }
  | { kind: "gift"; code: string }

export function appliedDiscountEntriesFromCart(cart: {
  promotions?: { code?: string; is_automatic?: boolean }[] | null
  metadata?: Record<string, unknown> | null
}): AppliedDiscountEntry[] {
  const promos: AppliedDiscountEntry[] = (cart.promotions ?? [])
    .filter((p): p is { code: string; is_automatic?: boolean } => Boolean(p.code))
    .map((p) =>
      p.is_automatic === true
        ? { kind: "promo" as const, code: p.code, is_automatic: true as const }
        : { kind: "promo" as const, code: p.code }
    )
  const gifts = parseGiftCardRedemptions(cart.metadata ?? undefined).map((g) => ({
    kind: "gift" as const,
    code: g.code,
  }))
  return [...promos, ...gifts]
}

/** Line-item metadata when purchasing a digital gift card (Medusa `metadata.gift_card`). */
export type GiftCardPurchaseLineMeta = {
  recipient_name?: string
  recipient_email?: string
  amount_cents?: number
}

export function isGiftCardPurchaseLineItem(item: {
  is_giftcard?: boolean
  metadata?: Record<string, unknown> | null
}): boolean {
  if (item.is_giftcard) return true
  const meta = item.metadata
  return !!(meta && typeof meta === "object" && "gift_card" in meta)
}

export function getGiftCardPurchaseMetaFromLineItem(item: {
  metadata?: Record<string, unknown> | null
}): GiftCardPurchaseLineMeta | null {
  const raw = item.metadata?.gift_card
  if (raw === undefined || raw === null || typeof raw !== "object") return null
  const g = raw as Record<string, unknown>
  return {
    recipient_name: typeof g.recipient_name === "string" ? g.recipient_name : undefined,
    recipient_email: typeof g.recipient_email === "string" ? g.recipient_email : undefined,
    amount_cents: typeof g.amount_cents === "number" ? g.amount_cents : undefined,
  }
}
