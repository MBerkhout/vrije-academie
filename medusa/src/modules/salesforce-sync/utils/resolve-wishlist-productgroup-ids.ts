import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { normalizeHandle } from "../../../lib/customer-wishlist"
import SalesforceSyncModuleService from "../service"

export type HandleToProductgroupResult = {
  handle: string
  productgroupSalesforceId: string | null
  medusaProductId: string | null
}

async function salesforceProductgroupIdForMedusaProduct(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  productId: string
): Promise<string | null> {
  const pg = await sync.getStateByMedusaId("productgroup", productId)
  if (pg?.salesforce_id?.trim()) return pg.salesforce_id.trim()
  const prod = await sync.getStateByMedusaId("product", productId)
  return prod?.salesforce_id?.trim() ?? null
}

/** Map storefront handles to vaProductgroup__c Salesforce Ids via product sync state. */
export async function resolveProductgroupIdsFromHandles(
  container: MedusaContainer,
  handles: string[]
): Promise<Map<string, HandleToProductgroupResult>> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const productService = container.resolve(Modules.PRODUCT)
  const out = new Map<string, HandleToProductgroupResult>()

  for (const raw of handles) {
    const handle = normalizeHandle(raw)
    if (!handle) continue
    if (out.has(handle)) continue

    const products = await productService.listProducts({ handle }, { take: 1, select: ["id", "handle"] })
    const product = products[0]
    if (!product?.id) {
      out.set(handle, { handle, productgroupSalesforceId: null, medusaProductId: null })
      continue
    }

    const productgroupSalesforceId = await salesforceProductgroupIdForMedusaProduct(
      sync,
      product.id
    )
    out.set(handle, {
      handle,
      productgroupSalesforceId,
      medusaProductId: product.id,
    })
  }

  return out
}
