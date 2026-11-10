/**
 * Rebuild storefront PDP cache for one handle.
 *
 *   npx medusa exec ./src/scripts/rebuild-event-detail-handle.ts -- --handle=college-het-oeuvre-van-david-hockney
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { rebuildEventDetail } from "../lib/event-detail-rebuild"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function rebuildEventDetailHandle({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const handle = arg("--handle")?.trim()
  if (!handle) {
    logger.error("[rebuild-event-detail-handle] Pass --handle=<slug>")
    return
  }
  const built = await rebuildEventDetail(container, handle, { revalidateStorefront: true })
  const variants = (built?.variants ?? []) as unknown[]
  logger.info(
    `[rebuild-event-detail-handle] ${handle} variants=${variants.length} delivery_types=${JSON.stringify(built?.delivery_types ?? [])}`
  )
}
