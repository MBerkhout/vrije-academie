import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getDocSyncStatus } from "../../../../../modules/sanity-sync/service"
import { syncProductCategoryById } from "../../../../../modules/sanity-sync/sync-product-category-by-id"
import { sanityStructureCategoryUrl } from "../../../../../utils/sanity-structure-url"

function openInSanityUrlForCategory(medusaCategoryId: string): string | null {
  const projectId = process.env.SANITY_PROJECT_ID
  if (!projectId) return null
  const base =
    process.env.SANITY_STUDIO_URL ?? `https://${projectId}.sanity.studio/studio`
  return sanityStructureCategoryUrl(base, medusaCategoryId)
}

async function categorySanityStatus(medusaCategoryId: string) {
  const status = await getDocSyncStatus(`medusa-category-${medusaCategoryId}`)
  return {
    ...status,
    openInSanityUrl: openInSanityUrlForCategory(medusaCategoryId),
  }
}

/** GET /admin/sanity/categories/:id — sync status and Studio deep link. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params
  res.json(await categorySanityStatus(id))
}

/** POST /admin/sanity/categories/:id — push (or re-push) this category to Sanity now. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await syncProductCategoryById(id, req.scope)
    await new Promise((r) => setTimeout(r, 500))
    const status = await categorySanityStatus(id)
    logger.info(`[sanity-sync] manual push for product category ${id}`)
    res.json({ success: true, ...status })
  } catch (err) {
    logger.error(`[sanity-sync] manual push failed for category ${id}: ${(err as Error).message}`)
    res.status(500).json({ success: false, error: (err as Error).message })
  }
}
