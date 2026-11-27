import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { PRODUCT_ANALYTICS_MODULE } from "../modules/product-analytics"
import type ProductAnalyticsModuleService from "../modules/product-analytics/service"
import { getOpenSearchClient, getSearchIndexName } from "../modules/search/client"
import { listProductCatalogCategoryLinks } from "../lib/product-catalog-category-links"
import { priceRowsToCents, variantsForPriceFrom } from "../lib/medusa-price-to-cents"
import productEventGroupLink from "../links/product-event-group"
import { salesforceOrderFromMetadata } from "../lib/listing-sort"

/**
 * Export data for the "sorteerlab" (product sorting simulation) to CSV files.
 *
 * Run: npm run export:sorting-data -- [--days=90] [--out=./tmp/sorting-export]
 */

type Row = Record<string, string | number | boolean | null | undefined>

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ""
  const s = v instanceof Date ? v.toISOString() : String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function writeCsv(file: string, columns: string[], rows: Row[]): void {
  const lines = [columns.join(",")]
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c])).join(","))
  writeFileSync(file, `\uFEFF${lines.join("\n")}\n`, "utf8")
}

function parseArgs(args: string[] | undefined) {
  const get = (name: string) =>
    (args ?? []).find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
  const days = Number(get("days") ?? 90)
  const stamp = new Date().toISOString().slice(0, 10)
  const out = path.resolve(get("out") ?? `./tmp/sorting-export-${stamp}`)
  return { days: Number.isFinite(days) && days > 0 ? days : 90, out }
}

const iso = (d: unknown): string | null => {
  if (!d) return null
  const t = new Date(d as string)
  return Number.isNaN(t.getTime()) ? null : t.toISOString()
}

const eur = (cents: number | null | undefined) =>
  cents == null ? null : (cents / 100).toFixed(2)

async function fetchAll<T>(
  query: { graph: (opts: any) => Promise<{ data: unknown[] }> },
  opts: Record<string, unknown>,
  pageSize = 500
): Promise<T[]> {
  const all: T[] = []
  for (let skip = 0; ; skip += pageSize) {
    const { data } = await query.graph({ ...opts, pagination: { skip, take: pageSize } })
    all.push(...((data ?? []) as T[]))
    if ((data ?? []).length < pageSize) break
  }
  return all
}

export default async function exportSortingData({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { days, out } = parseArgs(args)
  mkdirSync(out, { recursive: true })

  const since = new Date(Date.now() - days * 86400000)
  const sinceDate = since.toISOString().slice(0, 10)

  // ---- 1. Products + 2. Sessions ----
  const products = await fetchAll<Record<string, any>>(query, {
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "status",
      "created_at",
      "metadata",
      "type.value",
      "variants.id",
      "variants.sku",
      "variants.prices.*",
      "variants.event_item.*",
    ],
  })
  const productIds = products.map((p) => p.id as string)

  const groupLinks = await fetchAll<{ product_id: string; event_group?: Record<string, any> | null }>(
    query,
    { entity: productEventGroupLink.entryPoint, fields: ["product_id", "event_group.*"] }
  )
  const groupByProduct = new Map(groupLinks.map((l) => [l.product_id, l.event_group]))

  const catLinks = await listProductCatalogCategoryLinks(container, { product_id: productIds })
  const catsByProduct = new Map<string, string[]>()
  for (const l of catLinks) {
    const label = (l.catalog_category as { label?: string } | undefined)?.label
    if (l.product_id && label) {
      const arr = catsByProduct.get(l.product_id) ?? []
      arr.push(label)
      catsByProduct.set(l.product_id, arr)
    }
  }

  const productRows: Row[] = []
  const sessionRows: Row[] = []
  const variantToSession = new Map<string, string>()
  const handleByProduct = new Map<string, string>()

  for (const p of products) {
    handleByProduct.set(p.id, p.handle)
    const variants = (p.variants ?? []) as Array<Record<string, any>>
    const group = groupByProduct.get(p.id)
    const cents = variantsForPriceFrom(variants).flatMap((v) => priceRowsToCents(v.prices))
    const items = variants.map((v) => v.event_item).filter(Boolean) as Array<Record<string, any>>
    const metadata = (p.metadata ?? {}) as Record<string, unknown>
    const starts = items
      .map((i) => (i.start_at ? new Date(i.start_at).getTime() : NaN))
      .filter((t) => !Number.isNaN(t))
    const now = Date.now()

    productRows.push({
      product_id: p.id,
      slug: p.handle,
      title: p.title,
      activity_type: group?.record_type ?? null,
      product_type: p.type?.value ?? null,
      categories: (catsByProduct.get(p.id) ?? []).join("|"),
      price_from_eur: eur(cents.length ? Math.min(...cents) : null),
      price_max_eur: eur(cents.length ? Math.max(...cents) : null),
      published_at_proxy_created_at: iso(p.created_at),
      status: p.status,
      show_in_plp: group?.show_in_plp ?? null,
      order_value: salesforceOrderFromMetadata(metadata),
      order_source: "Salesforce vaProductgroup__c.Order__c (product.metadata.salesforce_order)",
      session_count: items.length,
      future_session_count: starts.filter((t) => t >= now).length,
      earliest_future_start: iso(Math.min(...starts.filter((t) => t >= now))),
    })

    for (const v of variants) {
      const ei = v.event_item as Record<string, any> | null | undefined
      if (!ei) continue
      variantToSession.set(v.id, ei.id)
      const capacity = Number(ei.capacity ?? 0)
      const available = Number(ei.available_quantity ?? 0)
      sessionRows.push({
        session_id: ei.id,
        variant_id: v.id,
        product_id: p.id,
        product_slug: p.handle,
        start_at: iso(ei.start_at),
        end_at: iso(ei.end_at),
        delivery_type: ei.delivery_type,
        city: ei.city ?? null,
        location_name: ei.location_name ?? null,
        capacity,
        available_quantity: available,
        sold_or_reserved: capacity > 0 ? Math.max(capacity - available, 0) : null,
        // Cancelled sessions are not imported; waitlist is only offered on sold-out sessions.
        status: capacity > 0 && available === 0 ? "volgeboekt" : "open",
        guaranteed_departure: null,
      })
    }
  }

  writeCsv(
    path.join(out, "products.csv"),
    [
      "product_id", "slug", "title", "activity_type", "product_type", "categories",
      "price_from_eur", "price_max_eur", "published_at_proxy_created_at", "status",
      "show_in_plp", "order_value", "order_source", "session_count",
      "future_session_count", "earliest_future_start",
    ],
    productRows
  )
  writeCsv(
    path.join(out, "sessions.csv"),
    [
      "session_id", "variant_id", "product_id", "product_slug", "start_at", "end_at",
      "delivery_type", "city", "location_name", "capacity", "available_quantity",
      "sold_or_reserved", "status", "guaranteed_departure",
    ],
    sessionRows
  )

  // ---- 3. Sales (order lines, last N days) ----
  const orders = await fetchAll<Record<string, any>>(query, {
    entity: "order",
    fields: [
      "id", "created_at", "status", "currency_code",
      "items.id", "items.variant_id", "items.product_id", "items.quantity", "items.unit_price",
    ],
    filters: { created_at: { $gte: since.toISOString() } },
  })
  const salesRows: Row[] = []
  for (const o of orders) {
    for (const it of (o.items ?? []) as Array<Record<string, any>>) {
      const qty = Number(it.quantity ?? 0)
      salesRows.push({
        order_id: o.id,
        order_line_id: it.id,
        order_date: iso(o.created_at),
        order_status: o.status,
        product_id: it.product_id ?? null,
        session_id: variantToSession.get(it.variant_id) ?? null,
        tickets: qty,
        revenue_eur: (Number(it.unit_price ?? 0) * qty).toFixed(2),
        currency: o.currency_code,
      })
    }
  }
  writeCsv(
    path.join(out, "sales.csv"),
    [
      "order_id", "order_line_id", "order_date", "order_status", "product_id",
      "session_id", "tickets", "revenue_eur", "currency",
    ],
    salesRows
  )

  // ---- 4. Behaviour (GA4 tables) ----
  const analytics = container.resolve(PRODUCT_ANALYTICS_MODULE) as unknown as ProductAnalyticsModuleService
  const daily = (await analytics.listProductAnalyticsDailies({}, { take: null })).filter(
    (r) => r.date >= sinceDate
  )
  const clicks = (await analytics.listProductListClickDailies({}, { take: null })).filter(
    (r) => r.date >= sinceDate
  )
  const idByHandle = new Map([...handleByProduct].map(([id, h]) => [h, id]))
  writeCsv(
    path.join(out, "behavior_daily.csv"),
    ["date", "product_handle", "product_id", "views", "unique_users", "add_to_cart", "list_clicks", "avg_list_position"],
    (daily as unknown as Row[]).map((r) => ({ ...r, product_id: idByHandle.get(String(r.product_handle)) ?? null }))
  )
  writeCsv(
    path.join(out, "list_clicks_daily.csv"),
    ["date", "product_handle", "product_id", "item_list_id", "position", "clicks"],
    (clicks as unknown as Row[]).map((r) => ({ ...r, product_id: idByHandle.get(String(r.product_handle)) ?? null }))
  )

  // ---- 5. Editorial (no source yet: empty template, to be filled by hand) ----
  writeCsv(
    path.join(out, "editorial_featured.csv"),
    ["product_id", "start_date", "end_date"],
    []
  )

  // ---- Index mapping + sample document ----
  const os = getOpenSearchClient()
  if (os) {
    try {
      const index = getSearchIndexName()
      const mapping = await os.indices.getMapping({ index })
      writeFileSync(path.join(out, "opensearch-mapping.json"), JSON.stringify(mapping.body, null, 2))
      const res = await os.search({
        index,
        body: { size: 1, query: { term: { kind: "product" } } },
      })
      const hit = (res.body as any).hits?.hits?.[0]?._source ?? null
      writeFileSync(path.join(out, "opensearch-sample-document.json"), JSON.stringify(hit, null, 2))
    } catch (e) {
      logger.warn(`[export] OpenSearch mapping/sample skipped: ${(e as Error).message}`)
    }
  } else {
    logger.warn("[export] OPENSEARCH_NODE not set: mapping/sample skipped.")
  }

  logger.info(
    `[export] ${productRows.length} products, ${sessionRows.length} sessions, ${salesRows.length} order lines, ` +
      `${daily.length} behaviour rows (since ${sinceDate}) -> ${out}`
  )
}
