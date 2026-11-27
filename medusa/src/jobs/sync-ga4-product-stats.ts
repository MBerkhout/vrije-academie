import type { MedusaContainer } from "@medusajs/framework/types"

import { getLookbackDays, lastDates } from "../lib/ga4/config"
import { syncGa4ProductStats } from "../lib/ga4/sync"
import { captureWithContext, withCronMonitor } from "../lib/sentry"

export default async function syncGa4ProductStatsJob(container: MedusaContainer) {
  await withCronMonitor("sync-ga4-product-stats", "0 3 * * *", async () => {
    try {
      const ran = await syncGa4ProductStats(container, lastDates(getLookbackDays()))
      if (!ran) console.log("[ga4] sync skipped (GA4_ENABLED/GA4_PROPERTY_ID/credentials not set)")
    } catch (error) {
      captureWithContext(error, { tags: { kind: "job", job: "sync-ga4-product-stats" } })
      throw error
    }
  })
}

/** Nightly 03:00; re-syncs the last few days because GA4 restates recent data. */
export const config = {
  name: "sync-ga4-product-stats",
  schedule: "0 3 * * *",
}
