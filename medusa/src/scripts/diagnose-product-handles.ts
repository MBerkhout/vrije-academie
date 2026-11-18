import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../links/product-docenten"
import { isFutureSession } from "../lib/event-session-eligibility"
import { isStorefrontVisibleVariant } from "../lib/salesforce-visible-on-website"
import { rebuildEventDetail } from "../lib/event-detail-rebuild"
import { syncProductById } from "../modules/sanity-sync/sync-product-by-id"

/**
 * Explains why a product handle 404s or shows no sessions on the storefront:
 * product status, every variant (visible flag, start, quantity), docents, and (optionally)
 * rebuilds the PDP cache and re-mirrors the product to Sanity.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/diagnose-product-handles.ts -- --handles=lezing-bernina,colleges-alma-mahler
 *   npx medusa exec ./src/scripts/diagnose-product-handles.ts -- --handles=... --fix   # rebuild PDP cache + re-sync Sanity
 */
export default async function diagnoseProductHandles({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const apply = process.argv.includes("--fix")
  const handles = (process.argv.find((a) => a.startsWith("--handles="))?.split("=")[1] ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)

  if (!handles.length) {
    logger.error("[diagnose] Pass --handles=<handle>,<handle>")
    return
  }

  for (const handle of handles) {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "handle",
        "status",
        "variants.id",
        "variants.sku",
        "variants.metadata",
        "variants.event_item.*",
      ],
      filters: { handle },
    })
    const product = data?.[0] as Record<string, any> | undefined
    if (!product) {
      logger.warn(`[diagnose] ${handle}: no Medusa product with this handle (renamed or deleted?)`)
      continue
    }

    const variants = (product.variants ?? []) as Record<string, any>[]
    const { data: docLinks } = await query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["docent.name", "docent.slug", "docent.is_active"],
      filters: { product_id: product.id },
    })

    logger.info(
      `[diagnose] ${handle}: id=${product.id} status=${product.status}` +
        `${product.status !== "published" ? "  <-- not published: storefront returns 404" : ""}` +
        ` variants=${variants.length} docents=${(docLinks ?? []).map((l: any) => l.docent?.name).join(", ") || "-"}`
    )
    for (const v of variants) {
      const ei = v.event_item as Record<string, any> | null | undefined
      const visible = isStorefrontVisibleVariant(v)
      const future = !ei || isFutureSession(ei)
      logger.info(
        `[diagnose]   ${v.sku} visible=${visible} future=${future} start=${ei?.start_at ? new Date(ei.start_at).toISOString() : "-"}` +
          ` city=${ei?.city ?? "-"} qty=${ei?.available_quantity ?? "-"} instructor=${ei?.instructor_name ?? "-"}` +
          `${!visible ? "  <-- hidden (Salesforce: Zichtbaar op Website unchecked)" : ""}`
      )
    }

    if (apply) {
      const built = await rebuildEventDetail(container, handle, { revalidateStorefront: true })
      logger.info(`[diagnose]   PDP cache rebuilt: ${built ? `variants=${(built.variants as unknown[]).length}` : "404"}`)
      await syncProductById(product.id, container)
      logger.info("[diagnose]   Sanity mirror re-synced")
    }
  }
}
