import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { hasInvisibleChars, stripInvisibleChars } from "../lib/strip-invisible-chars"

/**
 * Finds product and category handles containing zero-width / BOM characters.
 * `product.updated` triggers the Sanity mirror, so fixed handles propagate to Studio.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/fix-invisible-handles.ts          # report only
 *   npx medusa exec ./src/scripts/fix-invisible-handles.ts -- --fix # apply
 */
export default async function fixInvisibleHandles({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const apply = process.argv.includes("--fix")

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title"],
  })
  const badProducts = (products ?? []).filter((p) =>
    hasInvisibleChars(String((p as { handle?: string }).handle ?? ""))
  ) as { id: string; handle: string; title: string }[]

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name"],
  })
  const badCategories = (categories ?? []).filter((c) =>
    hasInvisibleChars(String((c as { handle?: string }).handle ?? ""))
  ) as { id: string; handle: string; name: string }[]

  for (const p of badProducts) {
    console.log(`product ${p.id} "${p.title}": ${JSON.stringify(stripInvisibleChars(p.handle))}`)
  }
  for (const c of badCategories) {
    console.log(`category ${c.id} "${c.name}": ${JSON.stringify(stripInvisibleChars(c.handle))}`)
  }
  console.log(`${badProducts.length} product(s), ${badCategories.length} category(ies) affected.`)

  if (!apply) {
    if (badProducts.length || badCategories.length) console.log("Dry run — re-run with -- --fix to clean.")
    return
  }

  for (const p of badProducts) {
    await updateProductsWorkflow(container).run({
      input: { selector: { id: p.id }, update: { handle: stripInvisibleChars(p.handle) } },
    })
  }

  if (badCategories.length) {
    const productModule = container.resolve(Modules.PRODUCT)
    for (const c of badCategories) {
      await productModule.updateProductCategories(c.id, { handle: stripInvisibleChars(c.handle) })
    }
  }
  console.log("Done.")
}
