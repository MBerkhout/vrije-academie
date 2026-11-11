/**
 * Read-only: describe Favourite__c and resolved field layout.
 *   npm run salesforce:inspect-favourite
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  clearFavouriteFieldLayoutCache,
  resolveFavouriteFieldLayout,
  SF_FAVOURITE_OBJECT,
} from "../modules/salesforce-sync/mappings/favourite"
import { sfRequest } from "../modules/salesforce-sync/client/rest"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { clearSalesforceDescribeCache } from "../modules/salesforce-sync/utils/salesforce-describe-fields"

export default async function inspectFavouriteDescribe({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  if (!(await sync.isIntegrationReady())) {
    logger.error("[inspect-favourite] Salesforce not configured (OAuth or env credentials)")
    return
  }

  clearSalesforceDescribeCache()
  clearFavouriteFieldLayoutCache()

  const layout = await resolveFavouriteFieldLayout()
  console.log("\n=== resolved layout ===\n", JSON.stringify(layout, null, 2))

  const { data } = await sfRequest<{
    fields?: Array<{
      name: string
      label: string
      type: string
      referenceTo?: string[]
      createable?: boolean
    }>
  }>("GET", `/sobjects/${encodeURIComponent(SF_FAVOURITE_OBJECT)}/describe`)

  const lookups = (data.fields ?? []).filter((f) => (f.referenceTo?.length ?? 0) > 0)
  console.log(`\n=== lookup fields (${lookups.length}) ===\n`)
  for (const f of lookups) {
    console.log(`${f.name} → ${JSON.stringify(f.referenceTo)}`)
  }
}
