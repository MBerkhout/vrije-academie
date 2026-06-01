import type { MedusaContainer } from "@medusajs/framework/types"

import SalesforceSyncModuleService from "../../../../modules/salesforce-sync/service"
import { salesforceObjectForEntity } from "../../../../modules/salesforce-sync/mappings/index"
import { adminSalesforceInstanceBase, salesforceRecordViewUrl } from "../../../../utils/salesforce-url"

export async function salesforceStatusForEntity(
  container: MedusaContainer,
  entityType: string,
  medusaId: string
): Promise<{
  salesforceId: string | null
  lastPushedAt: string | null
  lastPulledAt: string | null
  lastStatus: string | null
  lastError: string | null
  failureCount: number
  openInSalesforceUrl: string | null
  salesforceObject: string
}> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const row = await sync.getStateByMedusaId(entityType, medusaId)
  const sfObject = salesforceObjectForEntity(
    entityType as "customer" | "order" | "product" | "variant" | "productgroup" | "course_product"
  )
  const base = adminSalesforceInstanceBase()
  const openUrl =
    row?.salesforce_id && base
      ? salesforceRecordViewUrl(base, sfObject, row.salesforce_id)
      : null

  return {
    salesforceId: row?.salesforce_id ?? null,
    lastPushedAt: row?.last_pushed_at ? new Date(row.last_pushed_at).toISOString() : null,
    lastPulledAt: row?.last_pulled_at ? new Date(row.last_pulled_at).toISOString() : null,
    lastStatus: row?.last_status ?? null,
    lastError: row?.last_error ?? null,
    failureCount: row?.failure_count ?? 0,
    openInSalesforceUrl: openUrl,
    salesforceObject: sfObject,
  }
}
