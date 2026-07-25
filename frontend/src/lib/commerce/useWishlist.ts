'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { medusaClient as commerceClient } from './medusa-client'
import {
  addHandleToList,
  getWishlistHandlesLocal,
  mergeWishlistHandles,
  normalizeHandle,
  parseWishlistHandles,
  removeHandleFromList,
  setWishlistHandlesLocal,
  wishlistHandlesEqual,
} from './wishlist'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { trackAddToWishlist } from '@/lib/analytics/events/ecommerce'

export function useWishlist() {
  const { customer, loading: customerLoading, refresh } = useCustomer()
  const [localHandles, setLocalHandles] = useState<string[]>([])
  const [localReady, setLocalReady] = useState(false)
  const [pendingHandle, setPendingHandle] = useState<string | null>(null)
  const syncedCustomerIdRef = useRef<string | null>(null)

  useEffect(() => {
    setLocalHandles(getWishlistHandlesLocal())
    setLocalReady(true)
  }, [])

  useEffect(() => {
    if (customer) return
    syncedCustomerIdRef.current = null
  }, [customer])

  const serverHandles = useMemo(
    () => parseWishlistHandles(customer?.metadata),
    [customer?.metadata],
  )

  const handles = useMemo(
    () => (customer ? mergeWishlistHandles(localHandles, serverHandles) : localHandles),
    [customer, localHandles, serverHandles],
  )

  useEffect(() => {
    if (!customer?.id || !localReady) return
    if (syncedCustomerIdRef.current === customer.id) return

    syncedCustomerIdRef.current = customer.id
    const local = getWishlistHandlesLocal()
    const remote = parseWishlistHandles(customer.metadata)
    const merged = mergeWishlistHandles(local, remote)

    setLocalHandles(merged)
    setWishlistHandlesLocal(merged)

    if (wishlistHandlesEqual(merged, remote)) return

    void (async () => {
      try {
        await commerceClient.syncWishlistHandles(merged)
        await refresh()
      } catch {
        /* best-effort merge on login */
      }
    })()
  }, [customer?.id, customer?.metadata, localReady, refresh])

  const isInWishlist = useCallback(
    (handle: string) => {
      const h = normalizeHandle(handle)
      if (!h) return false
      return handles.includes(h)
    },
    [handles],
  )

  const persistHandles = useCallback(
    async (next: string[]) => {
      setLocalHandles(next)
      setWishlistHandlesLocal(next)
      if (customer) {
        await commerceClient.syncWishlistHandles(next)
        await refresh()
      }
    },
    [customer, refresh],
  )

  const toggle = useCallback(
    async (handle: string) => {
      const h = normalizeHandle(handle)
      if (!h) return
      setPendingHandle(h)
      try {
        const inList = handles.includes(h)
        const next = inList ? removeHandleFromList(handles, h) : addHandleToList(handles, h)
        await persistHandles(next)
        if (!inList) {
          try {
            const event = await commerceClient.getEvent(h)
            if (event) trackAddToWishlist(event)
          } catch {
            /* analytics best-effort */
          }
        }
      } finally {
        setPendingHandle(null)
      }
    },
    [handles, persistHandles],
  )

  const remove = useCallback(
    async (handle: string) => {
      const h = normalizeHandle(handle)
      if (!h) return
      setPendingHandle(h)
      try {
        await persistHandles(removeHandleFromList(handles, h))
      } finally {
        setPendingHandle(null)
      }
    },
    [handles, persistHandles],
  )

  return {
    handles,
    loading: customerLoading || !localReady,
    pendingHandle,
    isInWishlist,
    toggle,
    remove,
  }
}
