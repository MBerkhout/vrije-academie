import type { MedusaContainer } from "@medusajs/framework/types"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

export function salesforceRecordViewUrl(
  instanceBase: string,
  salesforceObjectApiName: string,
  salesforceId: string
): string {
  const base = instanceBase.replace(/\/$/, "")
  return `${base}/lightning/r/${salesforceObjectApiName}/${salesforceId}/view`
}

/** Base URL for Lightning (from SALESFORCE_INSTANCE_URL). */
export function adminSalesforceInstanceBase(): string {
  return process.env.SALESFORCE_INSTANCE_URL?.trim().replace(/\/$/, "") || ""
}

/** Env instance URL, else OAuth-stored instance from Admin connect. */
export async function resolveAdminSalesforceInstanceBase(
  container: MedusaContainer
): Promise<string> {
  const fromEnv = adminSalesforceInstanceBase()
  if (fromEnv) return fromEnv

  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const summary = await sync.getOAuthStatusSummary()
  return summary.instanceUrl?.trim().replace(/\/$/, "") || ""
}
