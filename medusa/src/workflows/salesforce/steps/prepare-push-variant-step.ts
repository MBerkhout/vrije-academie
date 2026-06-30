import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import { variantMapping } from "../../../modules/salesforce-sync/mappings/variant"
import type { MedusaVariantShape } from "../../../modules/salesforce-sync/mappings/variant"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

import type { UpsertSalesforceInput } from "./upsert-salesforce-step"

export type PreparePushVariantInput = { variantId: string }

export type PreparePushVariantOutput = UpsertSalesforceInput & {
  entityType: "variant"
  medusaId: string
  /** Product group id for Sanity mirror after Salesforce. */
  parentProductId: string
}

export const preparePushVariantStep = createStep(
  { name: "prepare-push-variant", maxRetries: 2, retryInterval: 5 },
  async (input: PreparePushVariantInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    const row = await sync.getStateByMedusaId("variant", input.variantId)
    if (row?.incoming_lock_until && new Date(row.incoming_lock_until) > new Date()) {
      const out: PreparePushVariantOutput = {
        skipped: true,
        salesforceObject: "Product2",
        externalIdField: variantMapping.externalIdField,
        externalId: input.variantId,
        fields: {},
        entityType: "variant",
        medusaId: input.variantId,
        parentProductId: "",
      }
      return new StepResponse(out)
    }

    const productModule = container.resolve(Modules.PRODUCT)
    const variant = await productModule.retrieveProductVariant(input.variantId)

    const v: MedusaVariantShape = {
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      product_id: variant.product_id,
    }

    const fields = variantMapping.toSalesforce(v) as Record<string, unknown>

    const out: PreparePushVariantOutput = {
      skipped: false,
      salesforceObject: "Product2",
      externalIdField: variantMapping.externalIdField,
      externalId: input.variantId,
      fields,
      entityType: "variant",
      medusaId: input.variantId,
      parentProductId: variant.product_id ?? "",
    }
    return new StepResponse(out)
  }
)
