import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import productEventGroupLink from "../links/product-event-group"
import type EventsModuleService from "../modules/events/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { isLinkedOnlineSlaveProduct } from "../lib/store-listing-eligibility"

/**
 * Enable "Show on Ons aanbod" for product(s).
 *
 * Usage:
 *   npx medusa exec ./src/scripts/enable-show-in-plp.ts [handle]
 *   npx medusa exec ./src/scripts/enable-show-in-plp.ts --all
 *   npx medusa exec ./src/scripts/enable-show-in-plp.ts --all-sf
 */
export default async function enableShowInPlp({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const events = container.resolve("events") as InstanceType<typeof EventsModuleService>

  const handleArg = process.argv.find((a) => !a.startsWith("-") && a !== process.argv[0] && !a.includes("enable-show-in-plp") && !a.endsWith(".ts"))
  const allSf = process.argv.includes("--all-sf")
  const allHidden = process.argv.includes("--all")

  if (allSf || allHidden) {
    const sync = container.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >

    let productIds: string[]
    if (allSf) {
      const rows = await sync.listSalesforceSyncStates({ entity_type: "productgroup" })
      productIds = [...new Set(rows.map((r) => r.medusa_id).filter(Boolean) as string[])]
    } else {
      const { data: links } = await query.graph({
        entity: productEventGroupLink.entryPoint,
        fields: ["product_id", "event_group.id", "event_group.show_in_plp"],
      })
      productIds = [
        ...new Set(
          (links ?? [])
            .filter((row) => (row as { event_group?: { show_in_plp?: boolean } }).event_group?.show_in_plp === false)
            .map((row) => (row as { product_id?: string }).product_id)
            .filter(Boolean) as string[]
        ),
      ]
    }

    const { data: links } = await query.graph({
      entity: productEventGroupLink.entryPoint,
      fields: ["product_id", "event_group.id", "event_group.show_in_plp"],
      filters: { product_id: productIds },
    })

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
      filters: { id: productIds },
    })
    const metadataById = new Map(
      (products ?? []).map((p) => {
        const row = p as { id?: string; metadata?: Record<string, unknown> | null }
        return [row.id, row.metadata ?? null] as const
      })
    )

    const toEnable = (links ?? []).filter((row) => {
      const typed = row as { product_id?: string; event_group?: { id: string; show_in_plp?: boolean } }
      if (typed.event_group?.show_in_plp !== false) return false
      if (isLinkedOnlineSlaveProduct(metadataById.get(typed.product_id) ?? null)) return false
      return true
    }) as { product_id?: string; event_group?: { id: string } }[]

    let updated = 0
    for (const row of toEnable) {
      const groupId = row.event_group?.id
      if (!groupId) continue
      await events.updateEventGroups({ id: groupId, show_in_plp: true })
      updated++
    }

    console.log(`show_in_plp=true for ${updated} product group(s)`)
    return
  }

  const handle = handleArg?.trim() || "lezing-amrita-sher-gil"

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "metadata"],
    filters: { handle },
  })
  const product = products?.[0] as {
    id: string
    handle: string
    title: string
    metadata?: Record<string, unknown> | null
  } | undefined
  if (!product) {
    console.log(`Product not found: ${handle}`)
    return
  }

  if (isLinkedOnlineSlaveProduct(product.metadata)) {
    console.log(`Skipped linked-online slave catalog: ${product.title} (${handle})`)
    return
  }

  const { data: links } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["event_group.id", "event_group.show_in_plp"],
    filters: { product_id: product.id },
  })
  const groupId = (links?.[0] as { event_group?: { id: string } })?.event_group?.id
  if (!groupId) {
    console.log(`No event group for ${handle}`)
    return
  }

  await events.updateEventGroups({ id: groupId, show_in_plp: true })
  console.log(`show_in_plp=true for ${product.title} (${handle})`)
}
