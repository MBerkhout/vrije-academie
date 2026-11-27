import { MedusaService } from "@medusajs/framework/utils"

import { ProductAnalyticsDaily } from "./models/product-analytics-daily"
import { ProductListClickDaily } from "./models/product-list-click-daily"

export type DailyRow = {
  product_handle: string
  date: string
  views: number
  unique_users: number
  add_to_cart: number
  list_clicks: number
  avg_list_position: number | null
}

export type ListClickRow = {
  product_handle: string
  date: string
  item_list_id: string
  position: number
  clicks: number
}

class ProductAnalyticsModuleService extends MedusaService({
  ProductAnalyticsDaily,
  ProductListClickDaily,
}) {
  /** Idempotent: rows for the same (handle, date) are updated, others created. */
  async upsertDaily(rows: DailyRow[]): Promise<void> {
    if (!rows.length) return
    const dates = [...new Set(rows.map((r) => r.date))]
    const existing = await this.listProductAnalyticsDailies(
      { date: dates },
      { take: null }
    )
    const idByKey = new Map(
      existing.map((e) => [`${e.product_handle}|${e.date}`, e.id])
    )
    const toCreate: DailyRow[] = []
    const toUpdate: (DailyRow & { id: string })[] = []
    for (const row of rows) {
      const id = idByKey.get(`${row.product_handle}|${row.date}`)
      if (id) toUpdate.push({ ...row, id })
      else toCreate.push(row)
    }
    if (toCreate.length) await this.createProductAnalyticsDailies(toCreate)
    if (toUpdate.length) await this.updateProductAnalyticsDailies(toUpdate)
  }

  async upsertListClicks(rows: ListClickRow[]): Promise<void> {
    if (!rows.length) return
    const dates = [...new Set(rows.map((r) => r.date))]
    const existing = await this.listProductListClickDailies(
      { date: dates },
      { take: null }
    )
    const key = (r: ListClickRow) =>
      `${r.product_handle}|${r.date}|${r.item_list_id}|${r.position}`
    const idByKey = new Map(existing.map((e) => [key(e as ListClickRow), e.id]))
    const toCreate: ListClickRow[] = []
    const toUpdate: (ListClickRow & { id: string })[] = []
    for (const row of rows) {
      const id = idByKey.get(key(row))
      if (id) toUpdate.push({ ...row, id })
      else toCreate.push(row)
    }
    if (toCreate.length) await this.createProductListClickDailies(toCreate)
    if (toUpdate.length) await this.updateProductListClickDailies(toUpdate)
  }

  async getRange(handle: string, from: string, to: string) {
    const rows = await this.listProductAnalyticsDailies(
      { product_handle: handle },
      { take: null, order: { date: "ASC" } }
    )
    return rows.filter((r) => r.date >= from && r.date <= to)
  }
}

export default ProductAnalyticsModuleService
