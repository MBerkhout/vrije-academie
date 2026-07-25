import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { productMapping } from "../../../modules/salesforce-sync/mappings/product"
import type { MedusaProductShape } from "../../../modules/salesforce-sync/mappings/product"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

import type { UpsertSalesforceInput } from "./upsert-salesforce-step"

export type PreparePushProductInput = { productId: string }

export type PreparePushProductOutput = UpsertSalesforceInput & {
  entityType: "product"
  medusaId: string
}

export const preparePushProductStep = createStep(
  { name: "prepare-push-product", maxRetries: 2, retryInterval: 5 },
  async (input: PreparePushProductInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const row = await sync.getStateByMedusaId("product", input.productId)
    if (row?.incoming_lock_until && new Date(row.incoming_lock_until) > new Date()) {
      const out: PreparePushProductOutput = {
        skipped: true,
        salesforceObject: "Product2",
        externalIdField: productMapping.externalIdField,
        externalId: input.productId,
        fields: {},
        entityType: "product",
        medusaId: input.productId,
      }
      return new StepResponse(out)
    }

    const productModule = container.resolve(Modules.PRODUCT)
    const product = await productModule.retrieveProduct(input.productId)

    const p: MedusaProductShape = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
    }

    const fields = productMapping.toSalesforce(p) as Record<string, unknown>

    const out: PreparePushProductOutput = {
      skipped: false,
      salesforceObject: "Product2",
      externalIdField: productMapping.externalIdField,
      externalId: input.productId,
      existingSalesforceId: row?.salesforce_id ?? null,
      fields,
      entityType: "product",
      medusaId: input.productId,
    }
    return new StepResponse(out)
  }
)
