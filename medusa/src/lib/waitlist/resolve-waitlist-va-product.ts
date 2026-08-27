import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../../modules/salesforce-sync/service"
import { isFutureSession } from "../event-session-eligibility"

const ENTITY_VARIANT = "variant"

type VariantWithEventItem = {
  id: string
  purchasable?: boolean | null
  event_item?: {
    start_at?: string | null
    available_quantity?: number | null
  } | null
}

/** Soonest upcoming bookable variant's Salesforce vaProduct__c id. */
export async function resolveWaitlistVaProductId(
  scope: MedusaContainer,
  handle: string
): Promise<{ productId: string; variantId: string; vaProductId: string }> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const sync = scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.purchasable", "variants.event_item.*"],
    filters: { handle },
  })

  const product = products[0] as { id: string; variants?: VariantWithEventItem[] } | undefined
  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Event not found")
  }

  const nowMs = Date.now()
  const candidates = (product.variants ?? [])
    .filter((variant) => variant.purchasable !== false)
    .filter((variant) => !variant.event_item || isFutureSession(variant.event_item, nowMs))
    .sort((a, b) => {
      const aStart = a.event_item?.start_at
        ? new Date(a.event_item.start_at).getTime()
        : Number.POSITIVE_INFINITY
      const bStart = b.event_item?.start_at
        ? new Date(b.event_item.start_at).getTime()
        : Number.POSITIVE_INFINITY
      return aStart - bStart
    })

  const variant = candidates[0]
  if (!variant?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No Salesforce-linked session available for waitlist"
    )
  }

  const variantState = await sync.getStateByMedusaId(ENTITY_VARIANT, variant.id)
  const vaProductId = variantState?.salesforce_id?.trim()
  if (!vaProductId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Event session has no Salesforce link — import product group first"
    )
  }

  return { productId: product.id, variantId: variant.id, vaProductId }
}
