'use client'

import { useEffect, useRef } from 'react'
import type { EventCard } from '@/lib/commerce/types'
import type { ItemListContext } from '@/lib/analytics/types'
import { trackViewItemList } from '@/lib/analytics/events/ecommerce'

export function ViewItemListTracker({
  list,
  events,
  loadType,
  batchId,
}: {
  list: ItemListContext
  events: EventCard[]
  loadType?: 'infinite_scroll'
  batchId?: string
}) {
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (events.length === 0) return
    const key = JSON.stringify({
      list,
      ids: events.map((e) => e.id),
      loadType,
      batchId,
    })
    if (lastKey.current === key) return
    lastKey.current = key
    trackViewItemList(list, events, {
      ...(loadType ? { loadType } : {}),
      ...(batchId ? { batchId } : {}),
    })
  }, [list, events, loadType, batchId])

  return null
}
