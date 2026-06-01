import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getDocSyncStatus } from "../../../../../modules/sanity-sync/service"
import { syncProductById } from "../../../../../modules/sanity-sync/sync-product-by-id"
import { sanityStructureProductUrl } from "../../../../../utils/sanity-structure-url"

/**
 * Deep link into Structure for the mirrored product document (`_type` product, `_id` medusa-product-…).
 * Set `SANITY_STUDIO_URL` to your Studio root including `basePath` (e.g. http://localhost:3333/studio).
 */
function openInSanityUrlForProduct(medusaProductId: string): string | null {
  const projectId = process.env.SANITY_PROJECT_ID
  if (!projectId) return null
  const base =
    process.env.SANITY_STUDIO_URL ?? `https://${projectId}.sanity.studio/studio`
  return sanityStructureProductUrl(base, medusaProductId)
}

async function productSanityStatus(medusaProductId: string) {
  const status = await getDocSyncStatus(`medusa-product-${medusaProductId}`)
  return {
    ...status,
    openInSanityUrl: openInSanityUrlForProduct(medusaProductId),
  }
}

/** GET /admin/sanity/products/:id — sync status and Studio deep link. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params
  res.json(await productSanityStatus(id))
}

/** POST /admin/sanity/products/:id — push (or re-push) this product to Sanity now. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await syncProductById(id, req.scope)
    // Small delay to allow Sanity to settle before reading _updatedAt
    await new Promise((r) => setTimeout(r, 500))
    const status = await productSanityStatus(id)
    logger.info(`[sanity-sync] manual push for product ${id}`)
    res.json({ success: true, ...status })
  } catch (err) {
    logger.error(`[sanity-sync] manual push failed for ${id}: ${(err as Error).message}`)
    res.status(500).json({ success: false, error: (err as Error).message })
  }
}
