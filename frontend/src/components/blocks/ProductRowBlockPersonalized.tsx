'use client'

import { useEffect, useState } from 'react'
import {
  commerceClient,
  getRecentViewedHandlesLocal,
  handlesForRecentDisplay,
  mergeRecentViewedHandles,
  parseRecentViewedHandles,
  personalizedProductRowHeading,
  resolvePersonalizedProductRowHandles,
  type EventCard,
} from '@/lib/commerce'
import { useWishlist } from '@/lib/commerce/useWishlist'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import type { ProductRowBlock as ProductRowBlockType } from '@/lib/cms'
import { ProductRowBlockView } from './ProductRowBlockView'

interface ProductRowBlockPersonalizedProps {
  block: ProductRowBlockType
}

/**
 * Client-only personalized row — wishlist first, else recently viewed; hidden when empty.
 */
export function ProductRowBlockPersonalized({ block }: ProductRowBlockPersonalizedProps) {
  const { customer } = useCustomer()
  const { handles: wishlistHandles, loading: wishlistLoading } = useWishlist()
  const [events, setEvents] = useState<EventCard[]>([])
  const [heading, setHeading] = useState('')
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const localRecent = getRecentViewedHandlesLocal()
      const remoteRecent = parseRecentViewedHandles(customer?.metadata)
      const mergedRecent = mergeRecentViewedHandles(localRecent, remoteRecent)
      const displayRecent = handlesForRecentDisplay(mergedRecent)

      const { mode, handles } = resolvePersonalizedProductRowHandles(
        wishlistHandles,
        displayRecent,
      )

      if (mode === 'none' || handles.length === 0) {
        if (!cancelled) {
          setEvents([])
          setHeading('')
          setResolved(true)
        }
        return
      }

      const results = await Promise.all(
        handles.map((handle) => commerceClient.getEvent(handle).catch(() => null))
      )
      const valid = results.filter((e): e is EventCard => e != null)

      if (!cancelled) {
        setEvents(valid)
        setHeading(personalizedProductRowHeading(block, mode))
        setResolved(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [block, customer?.metadata, wishlistHandles])

  if (wishlistLoading || !resolved || events.length === 0) return null

  return <ProductRowBlockView block={block} events={events} heading={heading} />
}
