'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ItemListContext } from '@/lib/analytics/types'

const ItemListContextValue = createContext<ItemListContext | null>(null)

export function ItemListProvider({
  list,
  children,
}: {
  list: ItemListContext
  children: ReactNode
}) {
  return (
    <ItemListContextValue.Provider value={list}>{children}</ItemListContextValue.Provider>
  )
}

export function useItemListContext(): ItemListContext | null {
  return useContext(ItemListContextValue)
}
