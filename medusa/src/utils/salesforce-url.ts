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
