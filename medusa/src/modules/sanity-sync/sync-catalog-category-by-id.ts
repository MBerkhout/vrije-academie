import type { MedusaContainer } from "@medusajs/framework/types"

import CatalogModuleService from "../catalog/service"
import { mirrorCategory } from "./service"

/** Mirror a catalog `Category` (Onderwerp) to Sanity. */
export async function syncCatalogCategoryById(
  categoryId: string,
  container: MedusaContainer
): Promise<void> {
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const [category] = await catalog.listCategories({ id: categoryId })
  if (!category) return
  await mirrorCategory(category)
}
