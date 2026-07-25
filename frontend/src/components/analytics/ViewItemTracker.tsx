'use client'

import { useEffect } from 'react'
import type { EventCard } from '@/lib/commerce/types'
import { trackViewItem } from '@/lib/analytics/events/ecommerce'

export function ViewItemTracker({ event }: { event: EventCard }) {
  useEffect(() => {
    trackViewItem(event)
  }, [event.handle, event.id])

  return null
}
