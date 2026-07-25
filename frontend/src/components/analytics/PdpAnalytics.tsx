'use client'

import type { ReactNode } from 'react'
import type { EventCard } from '@/lib/commerce/types'
import { PageTypeOverride } from '@/components/analytics/PageTypeOverride'
import { ViewItemTracker } from '@/components/analytics/ViewItemTracker'

export function PdpAnalytics({
  event,
  pageType = 'activiteit_detail',
  children,
}: {
  event: EventCard
  pageType?: 'activiteit_detail' | 'vathuis'
  children: ReactNode
}) {
  return (
    <PageTypeOverride pageType={pageType}>
      <ViewItemTracker event={event} />
      {children}
    </PageTypeOverride>
  )
}
