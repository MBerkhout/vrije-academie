import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { productTypeValueFromSalesforce } from "../mappings/productgroup"

/** Find or create a Medusa product type matching the Salesforce record type label. */
export async function resolveProductTypeId(
  container: MedusaContainer,
  recordTypeDeveloperName: string | null | undefined
): Promise<string | null> {
  const value = productTypeValueFromSalesforce(recordTypeDeveloperName)
  const productModule = container.resolve(Modules.PRODUCT)
  const existing = await productModule.listProductTypes({ value })
  if (existing[0]?.id) return existing[0].id

  const created = await productModule.createProductTypes({ value })
  const row = Array.isArray(created) ? created[0] : created
  return row?.id ?? null
}
