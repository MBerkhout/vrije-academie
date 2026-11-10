import { cache } from 'react'
import { commerceClient } from '@/lib/commerce'
import type { EventCard } from '@/lib/commerce/types'

/** Backend limit per `GET /store/events/by-handles` call. */
const MAX_HANDLES_PER_CALL = 8
/** Window to collect handles from blocks rendering in the same pass. */
const BATCH_WINDOW_MS = 5

interface Batcher {
  pending: Set<string>
  flush: Promise<Map<string, EventCard>> | null
}

/** One batcher per server request (React `cache` is request-scoped in RSC). */
const getBatcher = cache((): Batcher => ({ pending: new Set(), flush: null }))

function key(handle: string | undefined): string {
  return (handle ?? '').trim().toLowerCase()
}

async function runFlush(handles: string[]): Promise<Map<string, EventCard>> {
  const result = new Map<string, EventCard>()
  const chunks: string[][] = []
  for (let i = 0; i < handles.length; i += MAX_HANDLES_PER_CALL) {
    chunks.push(handles.slice(i, i + MAX_HANDLES_PER_CALL))
  }
  const responses = await Promise.all(chunks.map((c) => commerceClient.getEventsByHandles(c)))
  for (const events of responses) {
    for (const event of events) {
      const k = key(event.handle)
      if (k) result.set(k, event)
    }
  }
  return result
}

/**
 * Server-only. Collects handles from all Productkaarten blocks rendering in the
 * same request and resolves them with a single (chunked) by-handles call,
 * avoiding N+1 API calls. Returns events in the order of `handles`.
 */
export async function getEventsByHandlesBatched(handles: string[]): Promise<EventCard[]> {
  const batcher = getBatcher()
  for (const h of handles) batcher.pending.add(key(h))

  let flush = batcher.flush
  if (!flush) {
    flush = new Promise<string[]>((resolve) => {
      setTimeout(() => {
        const all = [...batcher.pending]
        // Allow a later batch within the same request to start a new flush.
        batcher.pending = new Set()
        batcher.flush = null
        resolve(all)
      }, BATCH_WINDOW_MS)
    }).then(runFlush)
    batcher.flush = flush
  }

  const map = await flush
  return handles.map((h) => map.get(key(h))).filter((e): e is EventCard => e != null)
}
