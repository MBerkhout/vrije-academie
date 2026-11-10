import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productEventGroupLink from "../../../links/product-event-group"
import SalesforceSyncModuleService from "../service"

import {
  REGISTRATION_CANCELLED,
  resolveLineTitle,
  type SfLineTitleInput,
} from "./resolve-salesforce-line-title"

export { REGISTRATION_CANCELLED, SF_LINE_GENERIC_TITLE } from "./resolve-salesforce-line-title"

export type SfHistoryOrderItemRow = SfLineTitleInput & {
  Id?: string
  ProductName__c?: string
  UnitPrice?: number
  TotalPrice?: number
  Quantity?: number
  vaProduct__c?: string
  Registration__c?: string
  Registration__r?: { Status__c?: string | null } | null
  vaProduct__r?: {
    Name?: string | null
    Start_date_time__c?: string | null
    Product_City__c?: string | null
    Account_Teacher__r?: { Name?: string | null } | null
    ProductGroup__r?: { Name?: string | null } | null
  } | null
  Product2?: { Name?: string | null } | null
}

export type MappedHistoryLine = {
  title: string
  quantity: number
  unit_price: number
  metadata: Record<string, unknown>
  softProductId: string | null
  softProductHandle: string | null
  isVathuis: boolean
}

export type MapLinesResult = {
  lines: MappedHistoryLine[]
  discountMajor: number
  skippedCancelledOnly: boolean
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function isDiscountLine(row: SfHistoryOrderItemRow): boolean {
  const qty = asNumber(row.Quantity)
  const unit = asNumber(row.UnitPrice)
  const name = row.ProductName__c?.trim().toLowerCase() ?? ""
  return qty < 0 || unit < 0 || name === "korting"
}

async function resolveSoftProduct(
  container: MedusaContainer,
  vaProductId: string | null
): Promise<{ productId: string | null; handle: string | null; isVathuis: boolean; variantId: string | null }> {
  if (!vaProductId?.trim()) {
    return { productId: null, handle: null, isVathuis: false, variantId: null }
  }

  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const states = await sync.listSalesforceSyncStates({
    entity_type: "variant",
    salesforce_id: vaProductId.trim(),
  })
  const state =
    states.find((s) => s.last_status === "success") ??
    states.sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return tb - ta
    })[0]
  const variantId = state?.medusa_id ?? null
  if (!variantId) {
    return { productId: null, handle: null, isVathuis: false, variantId: null }
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "product_id",
      "product.id",
      "product.handle",
      "product.status",
      "product.metadata",
    ],
    filters: { id: variantId },
  })
  const variant = (variants?.[0] ?? null) as Record<string, unknown> | null
  const product = (variant?.product as Record<string, unknown> | undefined) ?? null
  const productId = (product?.id as string | undefined) ?? (variant?.product_id as string | undefined) ?? null
  const status = product?.status as string | undefined
  const handle =
    status === "published" && typeof product?.handle === "string" ? product.handle : null

  let isVathuis = false
  if (productId) {
    const { data: groupLinks } = await query.graph({
      entity: productEventGroupLink.entryPoint,
      fields: ["product_id", "event_group.record_type"],
      filters: { product_id: productId },
    })
    const link = groupLinks?.[0] as { event_group?: { record_type?: string } } | undefined
    isVathuis = link?.event_group?.record_type === "vathuis"
  }

  return { productId, handle, isVathuis, variantId }
}

export async function mapSalesforceOrderLines(
  container: MedusaContainer,
  rows: SfHistoryOrderItemRow[]
): Promise<MapLinesResult> {
  let discountMajor = 0
  const importable: MappedHistoryLine[] = []

  for (const row of rows) {
    if (isDiscountLine(row)) {
      discountMajor += Math.abs(asNumber(row.TotalPrice) || asNumber(row.UnitPrice) * asNumber(row.Quantity))
      continue
    }

    const qty = asNumber(row.Quantity)
    if (qty <= 0) continue

    const regStatus = row.Registration__r?.Status__c?.trim()
    if (regStatus === REGISTRATION_CANCELLED) continue

    const vaProductId = row.vaProduct__c?.trim() || null
    const soft = await resolveSoftProduct(container, vaProductId)
    const title = resolveLineTitle(row)
    const unitPrice = asNumber(row.UnitPrice)

    importable.push({
      title,
      quantity: qty,
      unit_price: unitPrice,
      softProductId: soft.productId,
      softProductHandle: soft.handle,
      isVathuis: soft.isVathuis,
      metadata: {
        sf_order_item_id: row.Id ?? null,
        sf_va_product_id: vaProductId,
        product_id: soft.productId,
        product_handle: soft.handle,
        is_vathuis: soft.isVathuis,
        sf_variant_id: soft.variantId,
        sf_session_start_at: row.vaProduct__r?.Start_date_time__c ?? null,
        sf_city: row.vaProduct__r?.Product_City__c ?? null,
        sf_instructor: row.vaProduct__r?.Account_Teacher__r?.Name ?? null,
        sf_registration_status: regStatus ?? null,
      },
    })
  }

  return {
    lines: importable,
    discountMajor,
    skippedCancelledOnly: rows.length > 0 && importable.length === 0,
  }
}
