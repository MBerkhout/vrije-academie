/**
 * Read-only: list picklist values of OrderItem.Giftcard_Type__c (and Voucher__c.Type__c).
 *   npm run salesforce:inspect-giftcard-type
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

type Describe = {
  fields?: Array<{
    name: string
    type: string
    picklistValues?: Array<{ value: string; label: string; active: boolean }>
  }>
}

async function printPicklist(sobject: string, field: string) {
  const { data } = await sfRequest<Describe>(
    "GET",
    `/sobjects/${encodeURIComponent(sobject)}/describe`
  )
  const f = data.fields?.find((x) => x.name === field)
  if (!f) {
    console.log(`\n${sobject}.${field}: field not found`)
    return
  }
  console.log(`\n${sobject}.${field} (${f.type})`)
  for (const v of f.picklistValues ?? []) {
    console.log(`  ${v.active ? "•" : "x"} value="${v.value}" label="${v.label}"`)
  }
}

export default async function inspectGiftcardTypePicklist({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) {
    logger.error("[inspect-giftcard-type] Salesforce not configured")
    return
  }
  await printPicklist("OrderItem", "Giftcard_Type__c")
  await printPicklist("Voucher__c", "Type__c")
}
