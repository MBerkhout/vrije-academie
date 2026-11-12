import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { VATHUIS_ACCESS_MODULE } from "../../vathuis-access"
import type VathuisAccessModuleService from "../../vathuis-access/service"
import {
  isAccessActive,
  parseIsoDate,
  toIsoString,
  vathuisAccessExpiresAtWithOverride,
} from "../../../lib/vathuis-access-expiry"
import { ORDER_SALESFORCE_ORDER_DATE } from "./order-import-metadata"
import { salesforceEffectiveDateToGrantInstant } from "./salesforce-order-effective-date"

/**
 * Grant VA Thuis access for imported history lines (no variant_id on line items).
 * Uses metadata on lines + salesforce_order_date on the order header.
 */
export async function grantVathuisFromImportedOrder(
  container: MedusaContainer,
  orderId: string
): Promise<number> {
  const orderModule = container.resolve(Modules.ORDER)
  const vathuisAccess = container.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >

  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items"],
    select: ["id", "customer_id", "status", "metadata", "created_at", "items"],
  })
  if (order.status !== "completed" || !order.customer_id) return 0

  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  const sfDate = metadata[ORDER_SALESFORCE_ORDER_DATE]
  const grantedAt =
    parseIsoDate(typeof sfDate === "string" ? sfDate : null) ??
    salesforceEffectiveDateToGrantInstant(null, order.created_at as string)
  let granted = 0
  const items = order.items ?? []

  for (const item of items) {
    const lineMeta = (item.metadata ?? {}) as Record<string, unknown>
    if (lineMeta.is_vathuis !== true) continue
    const productId = typeof lineMeta.product_id === "string" ? lineMeta.product_id : null
    const handle =
      typeof lineMeta.product_handle === "string" ? lineMeta.product_handle.trim() : ""
    if (!productId || !handle) continue

    const validUntilMeta = lineMeta.sf_audience_player_valid_until
    const expiresAt = vathuisAccessExpiresAtWithOverride(
      grantedAt,
      typeof validUntilMeta === "string" ? validUntilMeta : null
    )
    if (!isAccessActive(toIsoString(expiresAt), new Date())) continue

    const variantId =
      typeof lineMeta.sf_variant_id === "string" && lineMeta.sf_variant_id.trim()
        ? lineMeta.sf_variant_id.trim()
        : `imported-${String(lineMeta.sf_va_product_id ?? productId)}`

    const existingForLine = await vathuisAccess.listCustomerVathuisAccesses(
      { order_id: orderId, order_line_item_id: item.id },
      { take: 1 }
    )
    if (existingForLine[0]) continue

    const existingForProduct = await vathuisAccess.listCustomerVathuisAccesses(
      { customer_id: order.customer_id, product_id: productId },
      { take: 1 }
    )
    const current = existingForProduct[0]
    const grantedAtIso = toIsoString(grantedAt)
    const newExpiresIso = toIsoString(expiresAt)
    const title = item.title ?? null

    if (current) {
      const currentExpires = parseIsoDate(current.expires_at)
      const mergedExpires =
        currentExpires && currentExpires.getTime() > expiresAt.getTime()
          ? currentExpires
          : expiresAt
      await vathuisAccess.updateCustomerVathuisAccesses({
        id: current.id,
        variant_id: variantId,
        order_id: orderId,
        order_line_item_id: item.id,
        granted_at: grantedAtIso,
        expires_at: toIsoString(mergedExpires),
        product_handle: handle,
        product_title: title,
      })
    } else {
      await vathuisAccess.createCustomerVathuisAccesses({
        customer_id: order.customer_id,
        product_id: productId,
        product_handle: handle,
        product_title: title,
        variant_id: variantId,
        order_id: orderId,
        order_line_item_id: item.id,
        granted_at: grantedAtIso,
        expires_at: newExpiresIso,
      })
    }
    granted += 1
  }

  return granted
}
