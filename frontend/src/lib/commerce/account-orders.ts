import type { Order } from '@/lib/commerce/types'

export function isOrderVisibleInAccount(order: Order): boolean {
  if (order.status === 'canceled') return false
  const metadata = order.metadata
  if (!metadata || typeof metadata !== 'object') return true
  return metadata.hidden_from_account !== true
}
