/**
 * Audit session facet coverage on future offline event items.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import EventsModuleService from "../modules/events/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { MEDUSA_FACET_SYNC_VERSION } from "../modules/salesforce-sync/utils/productgroup-fingerprint"

export default async function auditEventItemFacets({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const events = container.resolve("events") as InstanceType<typeof EventsModuleService>
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  const now = new Date()
  const allItems = await events.listEventItems({}, { take: 50000 })

  const futureOffline = allItems.filter((item) => {
    if (item.delivery_type !== "offline") return false
    if (!item.start_at) return true
    return new Date(item.start_at as string | Date) >= now
  })

  const stats = {
    total: futureOffline.length,
    location_name: futureOffline.filter((i) => i.location_name?.trim()).length,
    catalog_location_id: futureOffline.filter((i) => i.catalog_location_id).length,
    instructor_name: futureOffline.filter((i) => i.instructor_name?.trim()).length,
    docent_id: futureOffline.filter((i) => i.docent_id).length,
    city_only: futureOffline.filter((i) => i.city?.trim() && !i.location_name?.trim()).length,
  }

  logger.info(`[audit] future offline event items: ${JSON.stringify(stats)}`)

  const { data: pgStates } = await query.graph({
    entity: "salesforce_sync_state",
    fields: ["id", "salesforce_id", "mapping_version", "last_pulled_at"],
    filters: { entity_type: "productgroup" },
  })

  const states = (pgStates ?? []) as {
    salesforce_id?: string
    mapping_version?: string | null
    last_pulled_at?: string | Date | null
  }[]

  const withFacetVersion = states.filter((s) =>
    s.mapping_version?.includes("medusa_facet_sync_version")
  ).length
  const facetVersionMatch = states.filter((s) =>
    s.mapping_version?.includes(`"medusa_facet_sync_version":${MEDUSA_FACET_SYNC_VERSION}`)
  ).length

  logger.info(
    `[audit] productgroup sync states: ${states.length}, with facet version key: ${withFacetVersion}, at v${MEDUSA_FACET_SYNC_VERSION}: ${facetVersionMatch}`
  )

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.event_item.*"],
    filters: { status: "published" },
  })

  const emptyHandles: string[] = []
  const partialHandles: string[] = []

  for (const row of products ?? []) {
    const product = row as {
      handle?: string
      variants?: Array<{ event_item?: Record<string, unknown> | null }>
    }
    const handle = product.handle
    if (!handle) continue

    const futureItems = (product.variants ?? [])
      .map((v) => v.event_item)
      .filter(Boolean)
      .filter((item) => {
        if (item!.delivery_type !== "offline") return false
        if (!item!.start_at) return true
        return new Date(item!.start_at as string | Date) >= now
      }) as Record<string, unknown>[]

    if (futureItems.length === 0) continue

    const withLoc = futureItems.filter((i) => String(i.location_name ?? "").trim()).length
    const withDoc = futureItems.filter(
      (i) => String(i.instructor_name ?? "").trim() || i.docent_id
    ).length

    if (withLoc === 0 && withDoc === 0) {
      if (emptyHandles.length < 20) emptyHandles.push(handle)
    } else if (withLoc < futureItems.length || withDoc < futureItems.length) {
      if (partialHandles.length < 10) partialHandles.push(handle)
    }
  }

  logger.info(`[audit] sample empty handles (${emptyHandles.length}+): ${emptyHandles.join(", ")}`)
  logger.info(`[audit] sample partial handles: ${partialHandles.join(", ")}`)

  if (emptyHandles[0]) {
    const handle = emptyHandles[0]
    const sfRow = states.find((s) => {
      return false
    })
    void sfRow
    const { data: match } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
      filters: { handle },
    })
    const sfId = (match?.[0] as { metadata?: { salesforce_id?: string } })?.metadata?.salesforce_id
    logger.info(`[audit] first empty product ${handle} salesforce_id=${sfId ?? "?"}`)
    if (sfId) {
      const state = await sync.getStateBySalesforceId("productgroup", sfId)
      logger.info(
        `[audit]   last_pulled_at=${state?.last_pulled_at} facet_in_fp=${state?.mapping_version?.includes("medusa_facet_sync_version") ?? false}`
      )
    }
  }
}
