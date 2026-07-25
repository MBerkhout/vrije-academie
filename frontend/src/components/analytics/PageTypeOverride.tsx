'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { PageType } from '@/lib/analytics/types'

const PageTypeOverrideContext = createContext<PageType | undefined>(undefined)

export function PageTypeOverride({
  pageType,
  children,
}: {
  pageType: PageType
  children: ReactNode
}) {
  return (
    <PageTypeOverrideContext.Provider value={pageType}>{children}</PageTypeOverrideContext.Provider>
  )
}

export function usePageTypeOverride(): PageType | undefined {
  return useContext(PageTypeOverrideContext)
}
