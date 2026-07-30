import { createClient, type SanityClient } from "@sanity/client"

const RETRYABLE = new Set([429, 500, 502, 503, 504])
const RETRY_DELAYS_MS = [200, 1000, 5000]
const MAX_ATTEMPTS = 3

type SanityCallMetrics = {
  fetchCalls: number
  mutateTransactions: number
  createOrReplaceCalls: number
  deleteCalls: number
}

const metrics: SanityCallMetrics = {
  fetchCalls: 0,
  mutateTransactions: 0,
  createOrReplaceCalls: 0,
  deleteCalls: 0,
}

export function getSanityCallMetrics(): SanityCallMetrics {
  return { ...metrics }
}

export function resetSanityCallMetrics(): void {
  metrics.fetchCalls = 0
  metrics.mutateTransactions = 0
  metrics.createOrReplaceCalls = 0
  metrics.deleteCalls = 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function jitter(base: number): number {
  return base + Math.floor(Math.random() * 200)
}

export function getSanityClient(): SanityClient {
  const projectId = process.env.SANITY_PROJECT_ID
  const dataset = process.env.SANITY_DATASET ?? "production"
  const token = process.env.SANITY_WRITE_TOKEN

  if (!projectId || !token) {
    throw new Error("SANITY_PROJECT_ID and SANITY_WRITE_TOKEN must be set for Sanity sync")
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: "2024-01-01",
    useCdn: false,
  })
}

export function isSanityConfigured(): boolean {
  return !!(process.env.SANITY_PROJECT_ID && process.env.SANITY_WRITE_TOKEN)
}

async function withSanityRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0
  while (attempt < MAX_ATTEMPTS) {
    try {
      return await fn()
    } catch (err) {
      const status =
        typeof err === "object" &&
        err !== null &&
        "statusCode" in err &&
        typeof (err as { statusCode?: number }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : undefined

      if (status != null && RETRYABLE.has(status) && attempt < MAX_ATTEMPTS - 1) {
        await sleep(jitter(RETRY_DELAYS_MS[attempt] ?? 5000))
        attempt++
        continue
      }
      throw err
    }
  }
  throw new Error("Sanity request failed after retries")
}

export async function sanityFetch<T>(query: string, params?: Record<string, unknown>): Promise<T> {
  metrics.fetchCalls += 1
  const client = getSanityClient()
  return withSanityRetry(() => client.fetch<T>(query, params ?? {}))
}

export async function sanityMutateTransaction(
  docs: Record<string, unknown>[]
): Promise<void> {
  if (!docs.length) return
  metrics.mutateTransactions += 1
  const client = getSanityClient()
  await withSanityRetry(async () => {
    let tx = client.transaction()
    for (const doc of docs) {
      tx = tx.createOrReplace(doc as Parameters<typeof tx.createOrReplace>[0])
    }
    await tx.commit()
  })
}

export async function sanityCreateOrReplace(doc: Record<string, unknown>): Promise<void> {
  metrics.createOrReplaceCalls += 1
  const client = getSanityClient()
  await withSanityRetry(() => client.createOrReplace(doc as Parameters<typeof client.createOrReplace>[0]))
}

export async function sanityDelete(id: string): Promise<void> {
  metrics.deleteCalls += 1
  const client = getSanityClient()
  await withSanityRetry(() => client.delete(id))
}
