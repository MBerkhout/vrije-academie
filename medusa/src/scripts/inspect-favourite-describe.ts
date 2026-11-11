/**
 * Read-only: describe Favourite__c and resolved field layout.
 *   npm run salesforce:inspect-favourite
 */
import {
  clearFavouriteFieldLayoutCache,
  resolveFavouriteFieldLayout,
  SF_FAVOURITE_OBJECT,
} from "../modules/salesforce-sync/mappings/favourite"
import { sfRequest } from "../modules/salesforce-sync/client/rest"
import { salesforceAuthMode } from "../modules/salesforce-sync/utils/is-configured"
import { clearSalesforceDescribeCache } from "../modules/salesforce-sync/utils/salesforce-describe-fields"

export default async function inspectFavouriteDescribe() {
  const mode = salesforceAuthMode()
  if (!mode) {
    console.log("[inspect-favourite] Salesforce not configured — skip")
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
