import type SalesforceSyncModuleService from "../service"
import { SALESFORCE_DEFAULT_PRICEBOOK2_ID } from "./salesforce-config"

const cache = new Map<string, string>()

function cacheKey(pricebook2Id: string, product2Id: string): string {
  return `${pricebook2Id}:${product2Id}`
}

export async function resolvePricebookEntryId(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  product2Id: string,
  pricebook2Id = SALESFORCE_DEFAULT_PRICEBOOK2_ID
): Promise<string> {
  const key = cacheKey(pricebook2Id, product2Id)
  const hit = cache.get(key)
  if (hit) return hit

  const escaped = product2Id.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
  const q = await sync.query<{ Id: string }>(
    `SELECT Id FROM PricebookEntry WHERE Product2Id = '${escaped}' AND Pricebook2Id = '${pricebook2Id}' AND IsActive = true LIMIT 1`
  )
  const id = q.records[0]?.Id
  if (!id) {
    throw new Error(
      `No active PricebookEntry for Product2 ${product2Id} in pricebook ${pricebook2Id}`
    )
  }
  cache.set(key, id)
  return id
}
