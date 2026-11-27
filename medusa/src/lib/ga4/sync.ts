import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { PRODUCT_ANALYTICS_MODULE } from "../../modules/product-analytics"
import type ProductAnalyticsModuleService from "../../modules/product-analytics/service"
import { getGa4Config } from "./config"
import { fetchDayReports } from "./data-api"
import { mapReportsToRows } from "./map-reports"

async function loadProductHandles(container: MedusaContainer): Promise<Set<string>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const handles = new Set<string>()
  const take = 1000
  for (let skip = 0; ; skip += take) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["handle"],
      pagination: { skip, take },
    })
    for (const p of data as { handle?: string }[]) {
      if (p.handle) handles.add(p.handle)
    }
    if (data.length < take) break
  }
  return handles
}

/** Pull GA4 stats for the given dates (YYYY-MM-DD) and upsert them. Returns false when disabled. */
export async function syncGa4ProductStats(
  container: MedusaContainer,
  dates: string[]
): Promise<boolean> {
  const config = getGa4Config()
  if (!config) return false

  const service = container.resolve<ProductAnalyticsModuleService>(PRODUCT_ANALYTICS_MODULE)
  const known = await loadProductHandles(container)

  for (const date of dates) {
    const reports = await fetchDayReports(config, date)
    const { daily, listClicks } = mapReportsToRows(
      date,
      reports.views,
      reports.carts,
      reports.clicks,
      known
    )
    await service.upsertDaily(daily)
    await service.upsertListClicks(listClicks)
  }
  return true
}
