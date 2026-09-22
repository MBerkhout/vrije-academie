import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../../modules/salesforce-sync/service"
import { isFutureSession } from "../event-session-eligibility"
import { sessionIsWaitlistEligible } from "./waitlist-eligibility"

const ENTITY_VARIANT = "variant"

type VariantWithEventItem = {
  id: string
  purchasable?: boolean | null
  event_item?: {
    start_at?: string | null
    available_quantity?: number | null
  } | null
}

async function loadProductWithVariants(
  scope: MedusaContainer,
  handle: string
): Promise<{ id: string; variants?: VariantWithEventItem[] }> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.purchasable", "variants.event_item.*"],
    filters: { handle },
  })

  const product = products[0] as { id: string; variants?: VariantWithEventItem[] } | undefined
  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Event not found")
  }
  return product
}

async function vaProductIdForVariant(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  variantId: string
): Promise<string> {
  const variantState = await sync.getStateByMedusaId(ENTITY_VARIANT, variantId)
  const vaProductId = variantState?.salesforce_id?.trim()
  if (!vaProductId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Event session has no Salesforce link — import product group first"
    )
  }
  return vaProductId
}

/**
 * Resolve Salesforce vaProduct__c for waitlist signup.
 * When variantId is set, that sold-out session is used; otherwise the soonest upcoming bookable variant.
 */
export async function resolveWaitlistVaProductId(
  scope: MedusaContainer,
  handle: string,
  variantId?: string | null
): Promise<{ productId: string; variantId: string; vaProductId: string }> {
  const sync = scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const product = await loadProductWithVariants(scope, handle)
  const variants = product.variants ?? []

  if (variantId?.trim()) {
    const variant = variants.find((v) => v.id === variantId)
    if (!variant) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Session not found for this activity")
    }
    if (!sessionIsWaitlistEligible(variant)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Waitlist signup is only available for sold-out sessions"
      )
    }
    const vaProductId = await vaProductIdForVariant(sync, variant.id)
    return { productId: product.id, variantId: variant.id, vaProductId }
  }

  const nowMs = Date.now()
  const candidates = variants
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

  const vaProductId = await vaProductIdForVariant(sync, variant.id)
  return { productId: product.id, variantId: variant.id, vaProductId }
}
