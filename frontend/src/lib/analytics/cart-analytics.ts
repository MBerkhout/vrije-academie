import type { Cart } from '@/lib/commerce/types'
import type { CheckoutAttribution } from '@/lib/analytics/attribution'
import { commerceClient } from '@/lib/commerce'

export type CartAnalyticsMetadata = CheckoutAttribution

export function parseCartAnalytics(
  metadata: Record<string, unknown> | null | undefined
): CartAnalyticsMetadata | null {
  const raw = metadata?.analytics
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const event_id = typeof a.event_id === 'string' ? a.event_id.trim() : ''
  if (!event_id) return null
  return raw as CartAnalyticsMetadata
}

/** Merge analytics onto cart.metadata (preserves gift cards etc.). */
export async function persistCartAnalytics(
  cart: Cart,
  analytics: CartAnalyticsMetadata
): Promise<Cart> {
  const meta = { ...(cart.metadata ?? {}), analytics }
  return commerceClient.updateCart(cart.id, { metadata: meta })
}
