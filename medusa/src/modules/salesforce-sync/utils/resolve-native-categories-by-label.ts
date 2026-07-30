import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { batchLinkProductsToCategoryWorkflow } from "@medusajs/medusa/core-flows"

import { syncProductCategoryById } from "../../sanity-sync/sync-product-category-by-id"
import type { BulkImportContext } from "./import-context"
import { slugFromLabel } from "./slug-from-label"

/** Find or create native Medusa product categories and link them to a product. */
export async function linkNativeProductCategoriesByLabels(
  container: MedusaContainer,
  productId: string,
  labels: string[],
  importContext?: BulkImportContext
): Promise<string[]> {
  const productModule = container.resolve(Modules.PRODUCT) as {
    listProductCategories: (
      f?: Record<string, unknown>,
      o?: { take?: number }
    ) => Promise<{ id?: string; name?: string | null; handle?: string }[]>
    createProductCategories: (d: {
      name: string
      handle: string
    }) => Promise<{ id?: string; name?: string | null; handle?: string } | { id?: string; name?: string | null; handle?: string }[]>
  }

  const all = importContext
    ? await importContext.getNativeCategories(container)
    : await productModule.listProductCategories({}, { take: 1000 })
  const ids: string[] = []

  for (const label of labels) {
    const trimmed = label.trim()
    if (!trimmed) continue
    const handle = slugFromLabel(trimmed)

    let match =
      all.find((c) => c.name?.trim().toLowerCase() === trimmed.toLowerCase()) ??
      all.find((c) => c.handle === handle)

    if (!match) {
      try {
        const created = await productModule.createProductCategories({
          name: trimmed,
          handle,
        })
        match = Array.isArray(created) ? created[0] : created
      } catch {
        const [existing] = await productModule.listProductCategories({ handle })
        match = existing
      }
      if (match) {
        if (importContext) importContext.addNativeCategory(match)
        else all.push(match)
      }
    }
    if (!match?.id) continue

    ids.push(match.id)

    if (importContext?.skipSanitySync) {
      importContext.trackNativeCategory(match.id)
    } else {
      await syncProductCategoryById(match.id, container).catch(() => undefined)
    }

    await batchLinkProductsToCategoryWorkflow(container).run({
      input: { id: match.id, add: [productId] },
    })
  }

  return ids
}
