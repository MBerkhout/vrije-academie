import type { ExecArgs } from "@medusajs/framework/types"

import { syncGa4ProductStats } from "../lib/ga4/sync"

/**
 * Initial/backfill load of GA4 product stats.
 *
 * Run with: npx medusa exec ./src/scripts/backfill-ga4-product-stats.ts -- 2026-10-01 2026-11-26
 * (args: FROM TO, YYYY-MM-DD, inclusive; TO defaults to yesterday)
 */
export default async function backfillGa4ProductStats({ container, args }: ExecArgs) {
  const [from, toArg] = args ?? []
  const iso = /^\d{4}-\d{2}-\d{2}$/
  if (!from || !iso.test(from)) {
    throw new Error("Usage: medusa exec ./src/scripts/backfill-ga4-product-stats.ts -- FROM [TO]")
  }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const to = toArg && iso.test(toArg) ? toArg : yesterday

  const dates: string[] = []
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }

  const ran = await syncGa4ProductStats(container, dates)
  console.log(ran ? `[ga4] backfilled ${dates.length} day(s): ${from}..${to}` : "[ga4] disabled or not configured")
}
