import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const PAGE_SIZE = 500

/** All published product handles (PDP would not 404 for missing/unpublished product). */
export async function listPublishedProductHandleSet(
  scope: MedusaContainer
): Promise<Set<string>> {
  const productModule = scope.resolve(Modules.PRODUCT)
  const handles = new Set<string>()
  let skip = 0

  for (;;) {
    const page = await productModule.listProducts(
      { status: "published" },
      {
        select: ["handle"],
        take: PAGE_SIZE,
        skip,
      }
    )
    if (!page.length) break
    for (const row of page) {
      const h = typeof row.handle === "string" ? row.handle.trim().toLowerCase() : ""
      if (h) handles.add(h)
    }
    if (page.length < PAGE_SIZE) break
    skip += page.length
  }

  return handles
}
