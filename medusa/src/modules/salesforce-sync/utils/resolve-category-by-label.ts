import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import productCategoriesLink from "../../../links/product-categories"
import CatalogModuleService from "../../catalog/service"
import { slugFromLabel } from "./slug-from-label"
import { syncCatalogCategoryById } from "../../sanity-sync/sync-catalog-category-by-id"

type CatalogService = InstanceType<typeof CatalogModuleService>

/** Find or create a catalog category by editorial label (Onderwerp). */
export async function resolveCategoryByLabel(
  catalog: CatalogService,
  label: string
): Promise<{ id: string; slug: string; label: string } | null> {
  const trimmed = label.trim()
  if (!trimmed) return null

  const all = await catalog.listCategories({}, { take: 1000 })
  const match = all.find((c) => c.label.trim().toLowerCase() === trimmed.toLowerCase())
  if (match?.id) {
    return { id: match.id, slug: match.slug, label: match.label }
  }

  const slug = slugFromLabel(trimmed)
  const slugMatch = all.find((c) => c.slug === slug)
  if (slugMatch?.id) {
    return { id: slugMatch.id, slug: slugMatch.slug, label: slugMatch.label }
  }

  const created = await catalog.createCategories({
    slug,
    label: trimmed,
    sort_order: all.length,
  })
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) return null
  return { id: row.id, slug: row.slug, label: row.label }
}

export async function linkProductCategoriesByLabels(
  container: MedusaContainer,
  productId: string,
  labels: string[]
): Promise<string[]> {
  const catalog = container.resolve("catalog") as CatalogService
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const categoryIds: string[] = []
  for (const label of labels) {
    const cat = await resolveCategoryByLabel(catalog, label)
    if (!cat) continue
    categoryIds.push(cat.id)
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: productId },
        catalog: { catalog_category_id: cat.id },
      })
    } catch {
      // already linked
    }
    await syncCatalogCategoryById(cat.id, container).catch(() => undefined)
  }

  const { data: existingLinks } = await query.graph({
    entity: productCategoriesLink.entryPoint,
    fields: ["product_id", "catalog_category_id"],
    filters: { product_id: productId },
  })
  const allCats = await catalog.listCategories({}, { take: 1000 })
  const labelById = new Map(allCats.map((c) => [c.id, c.label.trim().toLowerCase()]))
  const desired = new Set(labels.map((l) => l.trim().toLowerCase()))
  for (const row of existingLinks ?? []) {
    const catId = (row as { catalog_category_id?: string }).catalog_category_id
    if (!catId) continue
    const lbl = labelById.get(catId)
    if (lbl && !desired.has(lbl)) {
      await link.dismiss({
        [Modules.PRODUCT]: { product_id: productId },
        catalog: { catalog_category_id: catId },
      })
    }
  }

  return categoryIds
}
