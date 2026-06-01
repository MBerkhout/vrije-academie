import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

import { productHandleFromSalesforce } from "../../../modules/salesforce-sync/mappings/product-handle"
import { productMapping } from "../../../modules/salesforce-sync/mappings/product"
import type { SfProduct2Shape } from "../../../modules/salesforce-sync/mappings/product"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"

const INCOMING_LOCK_MS = 10_000

export type ApplyProductFromSfInput = {
  /** When omitted, creates a new Medusa product (or updates an existing link for this SF id). */
  medusaId?: string | null
  salesforceId: string
  record: Record<string, unknown>
}

export type ApplyProductFromSfOutput = {
  medusaId: string
  created: boolean
  updated: boolean
}

async function setIncomingLock(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  medusaId: string,
  salesforceId?: string | null
): Promise<void> {
  const until = new Date(Date.now() + INCOMING_LOCK_MS)
  let row = await sync.getStateByMedusaId("product", medusaId)
  if (!row) {
    await sync.createSalesforceSyncStates([
      {
        entity_type: "product",
        medusa_id: medusaId,
        salesforce_id: salesforceId ?? null,
        incoming_lock_until: until,
        last_status: "retrying",
      },
    ])
    return
  }
  await sync.updateSalesforceSyncStates({
    id: row.id,
    salesforce_id: salesforceId ?? row.salesforce_id,
    incoming_lock_until: until,
    last_status: "retrying",
  })
}

async function resolveDefaultShippingProfileId(container: {
  resolve: (key: string) => unknown
}): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: {
      entity: string
      fields: string[]
    }) => Promise<{ data?: { id?: string }[] }>
  }
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const id = profiles?.[0]?.id
  if (!id) {
    throw new Error(
      "No shipping profile found. Create a default shipping profile in Medusa Admin before importing products."
    )
  }
  return id
}

export const applyProductFromSalesforceStep = createStep(
  { name: "apply-product-from-salesforce", maxRetries: 3, retryInterval: 30 },
  async (input: ApplyProductFromSfInput, { container }) => {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    const sf = input.record as SfProduct2Shape
    const mapped = productMapping.fromSalesforce(sf)
    const title = mapped.title ?? sf.Name ?? `Product ${input.salesforceId}`

    let targetMedusaId = input.medusaId?.trim() || null
    let created = false

    if (!targetMedusaId) {
      const linked = await sync.getStateBySalesforceId("product", input.salesforceId)
      targetMedusaId = linked?.medusa_id ?? null
    }

    if (targetMedusaId) {
      await setIncomingLock(sync, targetMedusaId, input.salesforceId)

      const clean: Record<string, unknown> = {}
      if (mapped.title !== undefined) clean.title = mapped.title
      if (mapped.description !== undefined) clean.description = mapped.description
      if (mapped.handle !== undefined) clean.handle = mapped.handle

      if (Object.keys(clean).length === 0) {
        return new StepResponse<ApplyProductFromSfOutput>({
          medusaId: targetMedusaId,
          created: false,
          updated: false,
        })
      }

      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: [targetMedusaId] },
          update: clean as { title?: string; description?: string; handle?: string },
        },
      })

      return new StepResponse<ApplyProductFromSfOutput>({
        medusaId: targetMedusaId,
        created: false,
        updated: true,
      })
    }

    targetMedusaId = generateEntityId(undefined, "prod")
    await setIncomingLock(sync, targetMedusaId, input.salesforceId)

    const handle =
      mapped.handle ??
      productHandleFromSalesforce(sf.Name, input.salesforceId, sf.StockKeepingUnit)
    const shippingProfileId = await resolveDefaultShippingProfileId(container)
    const variantTitle = title
    const sku = sf.StockKeepingUnit?.trim() || sf.Id || targetMedusaId

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: targetMedusaId,
            title,
            handle,
            description: mapped.description ?? undefined,
            status: ProductStatus.DRAFT,
            shipping_profile_id: shippingProfileId,
            options: [{ title: "Default", values: ["Default"] }],
            variants: [
              {
                title: variantTitle,
                sku,
                options: { Default: "Default" },
                manage_inventory: false,
                prices: [{ amount: 0, currency_code: "eur" }],
              },
            ],
          },
        ],
      },
    })

    created = true

    return new StepResponse<ApplyProductFromSfOutput>({
      medusaId: targetMedusaId,
      created,
      updated: false,
    })
  }
)
