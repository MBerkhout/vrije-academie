import type { MedusaContainer } from "@medusajs/framework/types"

import {
  buildProductMirrorDoc,
  productMirrorDocChanged,
  SANITY_PRODUCT_BATCH_FETCH_FIELDS,
  sanityProductDocId,
  type ExistingSanityProductDoc,
} from "./build-product-doc"
import { loadProductMirrorInputs } from "./load-product-mirror-input"
import { isSanityConfigured, sanityFetch, sanityMutateTransaction } from "./sanity-client"

export type BatchSyncProductsResult = {
  attempted: number
  written: number
  skipped: number
  failed: number
}

export type BatchSyncProductsOptions = {
  chunkSize?: number
  onChunkError?: (chunkIds: string[], err: Error) => void
}

const DEFAULT_CHUNK_SIZE = 50

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/**
 * Batch-sync Medusa products to Sanity: one GROQ read + one transaction commit per chunk.
 * Skips unchanged mirror docs (diff against existing Sanity state).
 */
export async function batchSyncProductsToSanity(
  productIds: string[],
  container: MedusaContainer,
  options: BatchSyncProductsOptions = {}
): Promise<BatchSyncProductsResult> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  const uniqueIds = [...new Set(productIds.filter(Boolean))]
  const result: BatchSyncProductsResult = {
    attempted: uniqueIds.length,
    written: 0,
    skipped: 0,
    failed: 0,
  }

  if (!uniqueIds.length || !isSanityConfigured()) {
    result.skipped = uniqueIds.length
    return result
  }

  for (const chunkIds of chunkArray(uniqueIds, chunkSize)) {
    const chunkStart = {
      written: result.written,
      skipped: result.skipped,
      failed: result.failed,
    }
    try {
      const mirrorInputs = await loadProductMirrorInputs(chunkIds, container)
      const sanityIds = chunkIds.map(sanityProductDocId)

      const existingRows = await sanityFetch<ExistingSanityProductDoc[]>(
        `*[_id in $ids]{${SANITY_PRODUCT_BATCH_FETCH_FIELDS}}`,
        { ids: sanityIds }
      )
      const existingById = new Map(
        (existingRows ?? []).map((row) => [row._id as string, row])
      )

      const docsToWrite: Record<string, unknown>[] = []

      for (const productId of chunkIds) {
        const input = mirrorInputs.get(productId)
        if (!input) {
          result.failed += 1
          continue
        }

        const sanityId = sanityProductDocId(productId)
        const existing = existingById.get(sanityId) ?? null
        const target = buildProductMirrorDoc(input, existing)

        if (productMirrorDocChanged(target, existing)) {
          docsToWrite.push(target)
        } else {
          result.skipped += 1
        }
      }

      if (docsToWrite.length) {
        await sanityMutateTransaction(docsToWrite)
        result.written += docsToWrite.length
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const chunkProcessed =
        result.written - chunkStart.written +
        result.skipped - chunkStart.skipped +
        result.failed - chunkStart.failed
      const chunkUnresolved = chunkIds.length - chunkProcessed
      if (chunkUnresolved > 0) {
        result.failed += chunkUnresolved
      }
      options.onChunkError?.(chunkIds, error)
    }
  }

  return result
}
