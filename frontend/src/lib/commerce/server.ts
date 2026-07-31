import 'server-only'

import { cache } from 'react'

import { medusaClient } from './medusa-client'
import type { EventCard } from './types'

/** Dedupe Medusa PDP fetches within a single request (metadata + page + content). */
export const getCachedEvent = cache((handle: string): Promise<EventCard | null> =>
  medusaClient.getEvent(handle)
)

export const getCachedSimilarEvents = cache((handle: string): Promise<EventCard[]> =>
  medusaClient.getSimilarEvents(handle).catch(() => [])
)
