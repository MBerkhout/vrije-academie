'use client'

import Link from 'next/link'
import type { EventCard } from '@/lib/commerce/types'
import { trackSelectItem } from '@/lib/analytics/events/ecommerce'
import { useItemListContext } from '@/components/analytics/ItemListProvider'

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

  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (list) trackSelectItem(list, event, index)
      }}
    >
      {children}
    </Link>
  )
}
