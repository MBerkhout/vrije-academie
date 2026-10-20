import { performance } from "node:perf_hooks"

type MinuteBucket = { events: Map<string, number> }

let bucket: MinuteBucket = { events: new Map() }
let bucketStartedAt = Date.now()

function flushMinuteSummaryIfNeeded(): void {
  const elapsed = Date.now() - bucketStartedAt
  if (elapsed < 60_000 || bucket.events.size === 0) return
  const counts = Object.fromEntries(bucket.events)
  console.info(
    JSON.stringify({
      tag: "subscriber-perf-minute",
      windowSec: Math.round(elapsed / 1000),
      counts,
    })
  )
  bucket = { events: new Map() }
  bucketStartedAt = Date.now()
}

function recordEvent(eventName: string, subscriberId: string): void {
  const key = `${eventName}:${subscriberId}`
  bucket.events.set(key, (bucket.events.get(key) ?? 0) + 1)
  flushMinuteSummaryIfNeeded()
}

/** Wrap subscriber handlers to log slow runs and per-minute event volume. */
export async function withSubscriberPerf(
  eventName: string,
  subscriberId: string,
  run: () => Promise<void>
): Promise<void> {
  recordEvent(eventName, subscriberId)
  const start = performance.now()
  try {
    await run()
  } finally {
    const ms = Math.round(performance.now() - start)
    if (ms >= 200) {
      console.info(
        JSON.stringify({
          tag: "subscriber-perf",
          event: eventName,
          subscriber: subscriberId,
          ms,
        })
      )
    }
  }
}
