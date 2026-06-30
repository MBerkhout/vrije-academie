/**
 * Verify linked-online merge + VAthuis import for sample Salesforce ids.
 *
 *   npx medusa exec ./src/scripts/verify-linked-vathuis-import.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productEventGroupLink from "../links/product-event-group"
import variantEventItemLink from "../links/variant-event-item"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

const PARENT_SF = "a051t0000038EsOAAU"
const VATHUIS_SF = "a052o00001Ai901AAB"
const LINKED_SF = "a05Mz00000UnoYfIAJ"

export default async function verifyLinkedVathuisImport({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  async function reportProductgroup(sfId: string, label: string) {
    const state = await sync.getStateBySalesforceId("productgroup", sfId)
    if (!state?.medusa_id) {
      logger.warn(`[verify] ${label}: no Medusa product for ${sfId}`)
      return
    }

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "title", "metadata", "variants.id", "variants.sku"],
      filters: { id: state.medusa_id },
    })
    const product = products?.[0] as Record<string, unknown> | undefined
    const { data: egLinks } = await query.graph({
      entity: productEventGroupLink.entryPoint,
      fields: ["event_group.record_type", "event_group.show_in_plp"],
      filters: { product_id: state.medusa_id },
    })
    const eg = (egLinks?.[0] as { event_group?: Record<string, unknown> } | undefined)?.event_group

    const variants = (product?.variants ?? []) as { id?: string; sku?: string }[]
    const { data: eiRows } = await query.graph({
      entity: variantEventItemLink.entryPoint,
      fields: ["product_variant_id", "event_item.delivery_type", "event_item.city"],
      filters: { product_variant_id: variants.map((v) => v.id).filter(Boolean) },
    })

    const deliveryTypes = [
      ...new Set(
        (eiRows ?? []).map(
          (r) => (r as { event_item?: { delivery_type?: string } }).event_item?.delivery_type
        )
      ),
    ].filter(Boolean)

    logger.info(
      `[verify] ${label}: handle=${product?.handle} variants=${variants.length} record_type=${eg?.record_type} show_in_plp=${eg?.show_in_plp} delivery_types=${deliveryTypes.join(",")}`
    )
  }

  await reportProductgroup(PARENT_SF, "Parent studiedag")
  await reportProductgroup(LINKED_SF, "Linked online slave")
  await reportProductgroup(VATHUIS_SF, "VAthuis Netsuke")

  const parentState = await sync.getStateBySalesforceId("productgroup", PARENT_SF)
  if (parentState?.medusa_id) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["metadata"],
      filters: { id: parentState.medusa_id },
    })
    const meta = (products?.[0] as { metadata?: Record<string, unknown> } | undefined)?.metadata
    logger.info(
      `[verify] Parent linked_online_id=${meta?.salesforce_linked_online_productgroup_id ?? "—"}`
    )

    const { data: eiRows } = await query.graph({
      entity: "product",
      fields: ["variants.id", "variants.sku", "variants.event_item.delivery_type"],
      filters: { id: parentState.medusa_id },
    })
    const variants = ((eiRows?.[0] as { variants?: unknown[] } | undefined)?.variants ??
      []) as { sku?: string; event_item?: { delivery_type?: string } }[]
    const onlineCount = variants.filter((v) => v.event_item?.delivery_type === "online").length
    const offlineCount = variants.filter((v) => v.event_item?.delivery_type === "offline").length
    logger.info(
      `[verify] Parent sessions: offline=${offlineCount} online=${onlineCount} total=${variants.length}`
    )
  }
}
