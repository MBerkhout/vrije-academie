import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { syncProductById } from "../../../modules/sanity-sync/sync-product-by-id"

export type SyncSanityProductInput = {
  skipped?: boolean
  productId: string
}

export const syncSanityAfterSalesforceStep = createStep(
  { name: "sync-sanity-after-salesforce", maxRetries: 2, retryInterval: 10 },
  async (input: SyncSanityProductInput, { container }) => {
    if (input.skipped || !input.productId) {
      return new StepResponse<{ ok: boolean; skipped?: boolean; skippedSanity?: boolean }>({
        ok: true,
        skipped: true,
      })
    }
    if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) {
      return new StepResponse<{ ok: boolean; skipped?: boolean; skippedSanity?: boolean }>({
        ok: true,
        skippedSanity: true,
      })
    }
    await syncProductById(input.productId, container)
    return new StepResponse<{ ok: boolean; skipped?: boolean; skippedSanity?: boolean }>({ ok: true })
  }
)
