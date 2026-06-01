import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { syncProductById } from "../../../modules/sanity-sync/sync-product-by-id"

export type SyncSanityAfterProductgroupInput = {
  skipped?: boolean
  medusaId?: string
}

export const syncSanityAfterProductgroupImportStep = createStep(
  { name: "sync-sanity-after-productgroup-import", maxRetries: 2, retryInterval: 10 },
  async (input: SyncSanityAfterProductgroupInput, { container }) => {
    if (input.skipped || !input.medusaId) {
      return new StepResponse({ ok: false, skippedSanity: true })
    }
    if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) {
      return new StepResponse({ ok: false, skippedSanity: true })
    }
    await syncProductById(input.medusaId, container)
    return new StepResponse({ ok: true })
  }
)
