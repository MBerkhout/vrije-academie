'use client'

import { useEffect } from 'react'
import { peekListingReturnAnchor } from '@/lib/listing-return-anchor'

export function useEnsureListingAnchorLoaded({
  knownIds,
  hasMore,
  loading,
  loadMore,
}: {
  knownIds: string[]
  hasMore: boolean
  loading: boolean
  loadMore: () => void
}) {
  const knownKey = knownIds.join('|')

  useEffect(() => {
    const target = peekListingReturnAnchor()
    if (!target) return
    if (knownKey.split('|').includes(target)) return
    if (hasMore && !loading) loadMore()
  }, [knownKey, hasMore, loading, loadMore])
}
