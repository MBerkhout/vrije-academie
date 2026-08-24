import type { MedusaContainer } from "@medusajs/framework/types"
import { ProductStatus } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

import PeopleModuleService from "../../people/service"
import SalesforceSyncModuleService from "../service"

export type ArchiveEntityResult = {
  medusaId: string
  entityType: string
  productIds: string[]
  docentIds: string[]
}

const ARCHIVABLE_DELETE_TYPES = new Set(["product", "productgroup", "docent"])

export function isArchivableDeleteEntity(entityType: string): boolean {
  return ARCHIVABLE_DELETE_TYPES.has(entityType)
}

export function isDeleteSkippedEntity(entityType: string): boolean {
  return entityType === "customer" || entityType === "order"
}

/** Soft-archive Medusa entities after a Salesforce delete webhook. */
export async function archiveEntityFromSalesforceDelete(
  container: MedusaContainer,
  entityType: string,
  medusaId: string
): Promise<ArchiveEntityResult> {
  const result: ArchiveEntityResult = {
    medusaId,
    entityType,
    productIds: [],
    docentIds: [],
  }

  if (entityType === "product" || entityType === "productgroup") {
    await updateProductsWorkflow(container).run({
      input: {
        products: [{ id: medusaId, status: ProductStatus.DRAFT }],
      },
    })
    result.productIds.push(medusaId)
    return result
  }

  if (entityType === "docent") {
    const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>
    await people.updateDocents({ id: medusaId, is_active: false })
    result.docentIds.push(medusaId)

    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const row = await sync.getStateByMedusaId("docent", medusaId)
    if (row) {
      await sync.updateSalesforceSyncStates({
        id: row.id,
        last_status: "success",
        last_error: null,
      })
    }
    return result
  }

  throw new Error(`archive not supported for entity_type ${entityType}`)
}
