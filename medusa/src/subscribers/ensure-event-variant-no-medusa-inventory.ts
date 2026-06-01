import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import variantEventItemLink from "../links/variant-event-item"

/**
 * Event "Products" use `EventItem.available_quantity`, not Medusa inventory.
 * When a variant is linked to an `EventItem`, keep `manage_inventory` off so
 * carts do not reserve stock via the inventory module.
 */
export default async function ensureEventVariantNoMedusaInventory({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const variantId = data.id
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  const { data: linkRows } = await query.graph({
    entity: variantEventItemLink.entryPoint,
    fields: ["id"],
    filters: { product_variant_id: variantId },
  })

  if (!linkRows?.length) {
    return
  }

  const variant = await productModule.retrieveProductVariant(variantId)
  if (variant.manage_inventory === false) {
    return
  }

  await productModule.updateProductVariants(variantId, {
    manage_inventory: false,
  })
}

export const config: SubscriberConfig = {
  event: ["product-variant.created", "product-variant.updated"],
}
