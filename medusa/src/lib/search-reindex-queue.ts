/**
 * Coalesces search reindex requests per product id.
 *
 * Salesforce imports emit hundreds of `product-variant.updated` / `product.updated`
 * events per minute, often many for the same product. Reindexing on every event
 * loaded the PLP listing snapshot concurrently and OOM'd `medusa-worker`.
 * Here each product id is reindexed at most once per debounce window, and only
 * one reindex runs at a time per process.
 */

const DEBOUNCE_MS = Number(process.env.SEARCH_REINDEX_DEBOUNCE_MS ?? 5000)

type Runner = (productId: string) => Promise<void>

const pending = new Set<string>()
let timer: NodeJS.Timeout | null = null
let draining = false
let runner: Runner | null = null

async function drain(): Promise<void> {
  if (draining || !runner) return
  draining = true
  try {
    while (pending.size > 0) {
      const [productId] = pending
      pending.delete(productId)
      try {
        await runner(productId)
      } catch (err) {
        console.warn(`[search-reindex-queue] ${productId} failed: ${String(err)}`)
      }
    }
  } finally {
    draining = false
  }
}

/** Queue a product for reindexing; duplicate ids within the window are merged. */
export function enqueueProductReindex(productId: string, run: Runner): void {
  runner = run
  pending.add(productId)
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    void drain()
  }, DEBOUNCE_MS)
  timer.unref?.()
}
