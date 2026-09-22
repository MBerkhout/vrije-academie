import { isFutureSession } from "../event-session-eligibility"

type WaitlistSessionVariant = {
  purchasable?: boolean | null
  event_item?: {
    start_at?: string | null
    available_quantity?: number | null
  } | null
}

/** True when a single session can accept waitlist signups (future, purchasable, qty 0). */
export function sessionIsWaitlistEligible(
  variant: WaitlistSessionVariant,
  nowMs: number = Date.now()
): boolean {
  if (variant.purchasable === false) return false
  if (variant.event_item && !isFutureSession(variant.event_item, nowMs)) return false
  return Number(variant.event_item?.available_quantity ?? 0) === 0
}
