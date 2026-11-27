import type { DailyRow, ListClickRow } from "../../modules/product-analytics/service"

export type ViewRow = { itemId: string; views: number; users: number }
export type CartRow = { itemId: string; addToCart: number }
export type ClickRow = {
  itemId: string
  listId: string
  position: number
  clicks: number
}

/** GA4 uses "(not set)" for missing dimension values. */
export function isUsableItemId(id: string): boolean {
  return !!id && id !== "(not set)"
}

/** Merge the three GA4 reports into per-product rows for one date. */
export function mapReportsToRows(
  date: string,
  views: ViewRow[],
  carts: CartRow[],
  clicks: ClickRow[],
  knownHandles?: Set<string>
): { daily: DailyRow[]; listClicks: ListClickRow[] } {
  const keep = (id: string) =>
    isUsableItemId(id) && (!knownHandles || knownHandles.has(id))

  const daily = new Map<string, DailyRow>()
  const get = (handle: string): DailyRow => {
    let row = daily.get(handle)
    if (!row) {
      row = {
        product_handle: handle,
        date,
        views: 0,
        unique_users: 0,
        add_to_cart: 0,
        list_clicks: 0,
        avg_list_position: null,
      }
      daily.set(handle, row)
    }
    return row
  }

  for (const v of views) {
    if (!keep(v.itemId)) continue
    const r = get(v.itemId)
    r.views += v.views
    r.unique_users += v.users
  }
  for (const c of carts) {
    if (!keep(c.itemId)) continue
    get(c.itemId).add_to_cart += c.addToCart
  }

  const listClicks = new Map<string, ListClickRow>()
  const posSum = new Map<string, { weighted: number; clicks: number }>()
  for (const c of clicks) {
    if (!keep(c.itemId)) continue
    const key = `${c.itemId}|${c.listId}|${c.position}`
    const existing = listClicks.get(key)
    if (existing) existing.clicks += c.clicks
    else
      listClicks.set(key, {
        product_handle: c.itemId,
        date,
        item_list_id: c.listId,
        position: c.position,
        clicks: c.clicks,
      })
    get(c.itemId).list_clicks += c.clicks
    if (c.position > 0) {
      const s = posSum.get(c.itemId) ?? { weighted: 0, clicks: 0 }
      s.weighted += c.position * c.clicks
      s.clicks += c.clicks
      posSum.set(c.itemId, s)
    }
  }
  for (const [handle, s] of posSum) {
    if (s.clicks > 0) {
      get(handle).avg_list_position = Math.round((s.weighted / s.clicks) * 100) / 100
    }
  }

  return { daily: [...daily.values()], listClicks: [...listClicks.values()] }
}
