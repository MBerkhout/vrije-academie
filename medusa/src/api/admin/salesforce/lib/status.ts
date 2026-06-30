import type { MedusaContainer } from "@medusajs/framework/types"

import SalesforceSyncModuleService from "../../../../modules/salesforce-sync/service"
import { salesforceObjectForEntity } from "../../../../modules/salesforce-sync/mappings/index"
import { resolveAdminSalesforceInstanceBase, salesforceRecordViewUrl } from "../../../../utils/salesforce-url"

export async function salesforceStatusForEntity(
  container: MedusaContainer,
  entityType: string,
  medusaId: string
): Promise<{
  salesforceId: string | null
  salesforceAccountId: string | null
  lastPushedAt: string | null
  lastPulledAt: string | null
  lastStatus: string | null
  lastError: string | null
  failureCount: number
  openInSalesforceUrl: string | null
  salesforceObject: string
  instanceUrl: string | null
}> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const row = await sync.getStateByMedusaId(entityType, medusaId)
  const sfObject = salesforceObjectForEntity(
    entityType as "customer" | "order" | "product" | "variant" | "productgroup" | "course_product"
  )
  const base = await resolveAdminSalesforceInstanceBase(container)
  const accountId = row?.salesforce_account_id?.trim() || null
  const contactId = row?.salesforce_id?.trim() || null

  let openObject = sfObject
  let openId = contactId
  if (entityType === "customer" && accountId) {
    openObject = "Account"
    openId = accountId
  }

  const openUrl = openId && base ? salesforceRecordViewUrl(base, openObject, openId) : null

  return {
    salesforceId: contactId,
    salesforceAccountId: accountId,
    lastPushedAt: row?.last_pushed_at ? new Date(row.last_pushed_at).toISOString() : null,
    lastPulledAt: row?.last_pulled_at ? new Date(row.last_pulled_at).toISOString() : null,
    lastStatus: row?.last_status ?? null,
    lastError: row?.last_error ?? null,
    failureCount: row?.failure_count ?? 0,
    openInSalesforceUrl: openUrl,
    salesforceObject: openObject,
    instanceUrl: base || null,
  }
}
