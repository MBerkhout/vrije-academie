'use client'

import { useCallback, useMemo, useState } from 'react'
import { commerceClient, normalizeHandle, parseWishlistHandles } from '@/lib/commerce'
import { useCustomer } from '@/lib/commerce/CustomerProvider'

export function useWishlist() {
  const { customer, loading, refresh } = useCustomer()
  const handles = useMemo(
    () => parseWishlistHandles(customer?.metadata),
    [customer?.metadata],
  )
  const [pendingHandle, setPendingHandle] = useState<string | null>(null)

  const isInWishlist = useCallback(
    (handle: string) => {
      const h = normalizeHandle(handle)
      if (!h) return false
      return handles.includes(h)
    },
    [handles],
  )

  const toggle = useCallback(
    async (handle: string) => {
      const h = normalizeHandle(handle)
      if (!h) return
      setPendingHandle(h)
      try {
        const inList = handles.includes(h)
        if (inList) {
          await commerceClient.removeWishlistHandle(h)
        } else {
          await commerceClient.addWishlistHandle(h)
        }
        await refresh()
      } finally {
        setPendingHandle(null)
      }
    },
    [handles, refresh],
  )

  const remove = useCallback(
    async (handle: string) => {
      const h = normalizeHandle(handle)
      if (!h) return
      setPendingHandle(h)
      try {
        await commerceClient.removeWishlistHandle(h)
        await refresh()
      } finally {
        setPendingHandle(null)
      }
    },
    [refresh],
  )

  return {
    handles,
    loading,
    pendingHandle,
    isInWishlist,
    toggle,
    remove,
  }
}
