import 'server-only'

import { cache } from 'react'

import {
  getSharedCachedEvent,
  getSharedCachedSimilarEvents,
} from '@/lib/commerce/cached-pdp'
import type { EventCard } from './types'

/** Per-request dedupe + cross-request Redis-backed cache via `unstable_cache`. */
export const getCachedEvent = cache(
  (handle: string): Promise<EventCard | null> => getSharedCachedEvent(handle)
)

export const getCachedSimilarEvents = cache(
  (handle: string): Promise<EventCard[]> => getSharedCachedSimilarEvents(handle)
)
