'use client'

import type { EventCard } from '@/lib/commerce/types'
import { trackSelectItem } from '@/lib/analytics/events/ecommerce'
import { useItemListContext } from '@/components/analytics/ItemListProvider'
import { ListingAnchorLink } from '@/components/plp/ListingAnchorLink'
import { listingProductAnchorId } from '@/lib/listing-return-anchor'

export function SelectItemLink({
  event,
  index,
  href,
  className,
  children,
}: {
  event: EventCard
  index?: number
  href: string
  className?: string
  children: React.ReactNode
}) {
  const list = useItemListContext()
  const anchorId = listingProductAnchorId(event.handle)

  return (
    <ListingAnchorLink
      href={href}
      anchorId={anchorId}
      className={className}
      onClick={() => {
        if (list) trackSelectItem(list, event, index)
      }}
    >
      {children}
    </ListingAnchorLink>
  )
}
