/** List docenten linked to a product by handle. */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import productDocentenLink from "../links/product-docenten"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function listProductDocenten({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const handle = arg("--handle")
  if (!handle) {
    logger.info("Usage: --handle=art-nouveau")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle },
  })
  const product = products?.[0] as { id?: string } | undefined
  if (!product?.id) {
    logger.error(`Product not found: ${handle}`)
    return
  }

  const { data: links } = await query.graph({
    entity: productDocentenLink.entryPoint,
    fields: ["*", "docent.*"],
    filters: { product_id: product.id },
  })

  logger.info(JSON.stringify(links, null, 2))
}
