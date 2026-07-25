'use client'

import { usePathname } from 'next/navigation'
import { ItemListProvider } from '@/components/analytics/ItemListProvider'
import { ViewItemListTracker } from '@/components/analytics/ViewItemListTracker'
import { buildPlpListContext } from '@/lib/analytics/mappers/list-context'
import type { EventCard } from '@/lib/commerce/types'

export function PlpListingAnalytics({
  events,
  categorySlug,
  categoryLabel,
  searchQuery,
  children,
}: {
  events: EventCard[]
  categorySlug?: string | null
  categoryLabel?: string | null
  searchQuery?: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? '/ons-aanbod'
  const list = buildPlpListContext({
    pathname,
    categorySlug,
    categoryLabel,
    searchQuery,
  })

  return (
    <ItemListProvider list={list}>
      <ViewItemListTracker list={list} events={events} />
      {children}
    </ItemListProvider>
  )
}
