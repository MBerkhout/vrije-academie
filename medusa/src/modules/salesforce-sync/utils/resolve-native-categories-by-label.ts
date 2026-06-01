import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { batchLinkProductsToCategoryWorkflow } from "@medusajs/medusa/core-flows"

import { slugFromLabel } from "./slug-from-label"
import { syncProductCategoryById } from "../../sanity-sync/sync-product-category-by-id"

/** Find or create native Medusa product categories and link them to a product. */
export async function linkNativeProductCategoriesByLabels(
  container: MedusaContainer,
  productId: string,
  labels: string[]
): Promise<string[]> {
  const productModule = container.resolve(Modules.PRODUCT)
  const all = await productModule.listProductCategories({}, { take: 1000 })
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
      if (match) all.push(match)
    }
    if (!match?.id) continue

    ids.push(match.id)
    await syncProductCategoryById(match.id, container).catch(() => undefined)
    await batchLinkProductsToCategoryWorkflow(container).run({
      input: { id: match.id, add: [productId] },
    })
  }

  return ids
}
