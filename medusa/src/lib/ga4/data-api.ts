import { BetaAnalyticsDataClient } from "@google-analytics/data"

import type { Ga4Config } from "./config"
import type { CartRow, ClickRow, ViewRow } from "./map-reports"

const PAGE_SIZE = 10000

type Dim = { name: string }
type Met = { name: string }

/** Runs a report for one day, paginating through all rows. */
async function runReport(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  date: string,
  dimensions: Dim[],
  metrics: Met[],
  eventName: string
): Promise<{ dims: string[]; mets: number[] }[]> {
  const out: { dims: string[]; mets: number[] }[] = []
  let offset = 0
  for (;;) {
    const [res] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: date, endDate: date }],
      dimensions,
      metrics,
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: eventName },
        },
      },
      limit: PAGE_SIZE,
      offset,
    })
    const rows = res.rows ?? []
    for (const r of rows) {
      out.push({
        dims: (r.dimensionValues ?? []).map((d) => d.value ?? ""),
        mets: (r.metricValues ?? []).map((m) => Number(m.value ?? 0)),
      })
    }
    offset += rows.length
    if (rows.length < PAGE_SIZE || offset >= (res.rowCount ?? 0)) break
  }
  return out
}

export type Ga4DayReports = {
  views: ViewRow[]
  carts: CartRow[]
  clicks: ClickRow[]
}

/**
 * Fetch per-product reports for one date.
 * Custom item-scoped dimension `customEvent:item_list_position` is optional
 * (set GA4_LIST_POSITION_DIMENSION to the API name); without it position is 0.
 */
export async function fetchDayReports(
  config: Ga4Config,
  date: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<Ga4DayReports> {
  const client = new BetaAnalyticsDataClient(
    config.credentials ? { credentials: config.credentials } : undefined
  )
  const id = config.propertyId
  const positionDim = env.GA4_LIST_POSITION_DIMENSION?.trim()

  const [views, carts, clicks] = await Promise.all([
    runReport(
      client, id, date,
      [{ name: "itemId" }],
      [{ name: "itemsViewed" }, { name: "activeUsers" }],
      "view_item"
    ),
    runReport(
      client, id, date,
      [{ name: "itemId" }],
      [{ name: "itemsAddedToCart" }],
      "add_to_cart"
    ),
    runReport(
      client, id, date,
      [
        { name: "itemId" },
        { name: "itemListId" },
        ...(positionDim ? [{ name: positionDim }] : []),
      ],
      [{ name: "itemsClickedInList" }],
      "select_item"
    ),
  ])

  return {
    views: views.map((r) => ({
      itemId: r.dims[0],
      views: r.mets[0],
      users: r.mets[1],
    })),
    carts: carts.map((r) => ({ itemId: r.dims[0], addToCart: r.mets[0] })),
    clicks: clicks.map((r) => ({
      itemId: r.dims[0],
      listId: r.dims[1] === "(not set)" ? "" : r.dims[1],
      position: positionDim ? Number(r.dims[2]) || 0 : 0,
      clicks: r.mets[0],
    })),
  }
}
