import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { isLinkedOnlineSlaveProduct } from "../../lib/store-listing-eligibility"
import SalesforceSyncModuleService from "../salesforce-sync/service"

export function linkedOnlineParentSalesforceIds(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  const raw = metadata?.salesforce_linked_online_parent_ids
  if (!Array.isArray(raw)) return []
  return raw
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim())
}

/** Published parent product handle for a slave, or null when none resolve. */
export function pickCanonicalParentHandle(
  parentSfIds: string[],
  parentHandleBySfGroupId: Map<string, string>
): string | null {
  const handles = parentSfIds
    .map((id) => parentHandleBySfGroupId.get(id))
    .filter((handle): handle is string => Boolean(handle?.trim()))
  if (!handles.length) return null
  return [...handles].sort((a, b) => a.localeCompare(b))[0]
}

/**
 * Resolve Salesforce product-group ids → published Medusa handles (for slave canonical URLs).
 */
export async function buildParentHandleBySfGroupId(
  parentSfIds: string[],
  container: MedusaContainer
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const uniqueParentIds = [...new Set(parentSfIds)]
  if (!uniqueParentIds.length) return result

  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const medusaIdBySfId = new Map<string, string>()
  await Promise.all(
    uniqueParentIds.map(async (sfId) => {
      const state = await sync.getStateBySalesforceId("productgroup", sfId)
      const medusaId = state?.medusa_id?.trim()
      if (medusaId) medusaIdBySfId.set(sfId, medusaId)
    })
  )

  const medusaIds = [...new Set(medusaIdBySfId.values())]
  if (!medusaIds.length) return result

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "status"],
    filters: { id: medusaIds },
  })

  const handleByMedusaId = new Map<string, { handle: string; status?: string }>()
  for (const row of products ?? []) {
    const product = row as { id?: string; handle?: string; status?: string }
    if (product.id && product.handle) {
      handleByMedusaId.set(product.id, {
        handle: product.handle,
        status: product.status,
      })
    }
  }

  for (const [sfId, medusaId] of medusaIdBySfId) {
    const product = handleByMedusaId.get(medusaId)
    if (!product) continue
    if (product.status && product.status !== "published") continue
    result.set(sfId, product.handle)
  }

  return result
}

export function slaveMirrorSeoFields(
  metadata: Record<string, unknown>,
  parentHandleBySfGroupId: Map<string, string>
): { is_linked_online_slave: boolean; canonical_parent_handle: string | null } {
  const isSlave = isLinkedOnlineSlaveProduct(metadata)
  if (!isSlave) {
    return { is_linked_online_slave: false, canonical_parent_handle: null }
  }
  const parentHandle = pickCanonicalParentHandle(
    linkedOnlineParentSalesforceIds(metadata),
    parentHandleBySfGroupId
  )
  return {
    is_linked_online_slave: true,
    canonical_parent_handle: parentHandle,
  }
}
