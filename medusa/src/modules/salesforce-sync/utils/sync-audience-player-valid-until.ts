import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { VATHUIS_ACCESS_MODULE } from "../../vathuis-access"
import type VathuisAccessModuleService from "../../vathuis-access/service"
import { parseIsoDate } from "../../../lib/vathuis-access-expiry"
import { ORDER_SALESFORCE_ORDER_DATE } from "./order-import-metadata"
import SalesforceSyncModuleService from "../service"
import { resolveSoftProduct } from "./map-salesforce-order-lines"
import { REGISTRATION_CANCELLED } from "./resolve-salesforce-line-title"
import { resolveCustomerSalesforceIds } from "./resolve-customer-salesforce-ids"
import { SF_REGISTRATION_OBJECT } from "./salesforce-config"

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

export type SfRegistrationAudienceValidRow = {
  Id?: string
  vaProduct__c?: string | null
  Order__c?: string | null
  Order_Item__c?: string | null
  Audience_Player_Valid_Until__c?: string | null
  Status__c?: string | null
}

export type SyncAudiencePlayerValidUntilResult = {
  scanned: number
  updated: number
}

export async function syncAudiencePlayerValidUntilForCustomer(
  container: MedusaContainer,
  customerId: string,
  email?: string | null
): Promise<SyncAudiencePlayerValidUntilResult | null> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) return null

  const sfIds = await resolveCustomerSalesforceIds(container, customerId, email)
  if (!sfIds?.accountId) return null

  let records: SfRegistrationAudienceValidRow[]
  try {
    const result = await sync.query<SfRegistrationAudienceValidRow>(
      `SELECT Id, vaProduct__c, Order__c, Order_Item__c, Audience_Player_Valid_Until__c, Status__c
       FROM ${SF_REGISTRATION_OBJECT}
       WHERE Account__c = '${escapeSoql(sfIds.accountId)}'
         AND Audience_Player_Valid_Until__c != null`
    )
    records = result.records ?? []
  } catch (err) {
    logger.warn(
      `[vathuis-access] Audience_Player_Valid_Until sync failed for ${customerId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
    return null
  }

  if (!records.length) {
    return { scanned: 0, updated: 0 }
  }

  const vathuisAccess = container.resolve(VATHUIS_ACCESS_MODULE) as InstanceType<
    typeof VathuisAccessModuleService
  >

  let updated = 0
  for (const row of records) {
    const regId = row.Id?.trim()
    const validUntilRaw = row.Audience_Player_Valid_Until__c
    if (!regId || !validUntilRaw?.trim()) continue

    const status = row.Status__c?.trim()
    if (status === REGISTRATION_CANCELLED) continue

    const vaProductId = row.vaProduct__c?.trim() || null
    const soft = await resolveSoftProduct(container, vaProductId)
    if (!soft.isVathuis || !soft.productId || !soft.handle) continue

    const variantId =
      soft.variantId?.trim() || (vaProductId ? `imported-${vaProductId}` : `imported-${soft.productId}`)

    let grantedAt: Date | undefined
    let medusaOrderId: string | null = null
    let medusaLineItemId: string | null = null

    const sfOrderId = row.Order__c?.trim()
    if (sfOrderId) {
      const orderState = await sync.getStateBySalesforceId("order", sfOrderId)
      medusaOrderId = orderState?.medusa_id?.trim() || null
      if (medusaOrderId) {
        const orderModule = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: orders } = await orderModule.graph({
          entity: "order",
          fields: ["id", "created_at", "metadata", "items.id", "items.metadata"],
          filters: { id: medusaOrderId },
        })
        const order = orders?.[0] as Record<string, unknown> | undefined
        if (order) {
          const metadata = (order.metadata ?? {}) as Record<string, unknown>
          const sfDate = metadata[ORDER_SALESFORCE_ORDER_DATE]
          grantedAt =
            parseIsoDate(typeof sfDate === "string" ? sfDate : null) ??
            parseIsoDate(order.created_at as string) ??
            undefined

          const sfOrderItemId = row.Order_Item__c?.trim()
          if (sfOrderItemId) {
            const items = (order.items as Record<string, unknown>[]) ?? []
            for (const item of items) {
              const lineMeta = (item.metadata ?? {}) as Record<string, unknown>
              if (lineMeta.sf_order_item_id === sfOrderItemId) {
                medusaLineItemId = String(item.id)
                break
              }
            }
          }
        }
      }
    }

    const changed = await vathuisAccess.applyValidUntilOverride({
      customerId,
      productId: soft.productId,
      productHandle: soft.handle,
      productTitle: null,
      variantId,
      audiencePlayerValidUntil: validUntilRaw,
      grantedAt,
      salesforceRegistrationId: regId,
      orderId: medusaOrderId,
      orderLineItemId: medusaLineItemId,
    })
    if (changed) updated += 1
  }

  if (updated > 0) {
    logger.info(
      `[vathuis-access] synced Audience_Player_Valid_Until for customer ${customerId}: ${updated} row(s)`
    )
  }

  return { scanned: records.length, updated }
}
