import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflowId } from "@medusajs/medusa/core-flows"

import { DEFAULT_GIFT_CARD_HANDLE } from "../lib/gift-card-cart"

/**
 * Idempotent: creates the single-variant digital gift card product used by /store/gift-cards/add-to-cart.
 *
 * Run: npm run seed:gift-card
 */
export default async function seedGiftCard({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const handle = process.env.GIFT_CARD_PRODUCT_HANDLE?.trim() || DEFAULT_GIFT_CARD_HANDLE

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle },
  })

  if (existing?.length) {
    console.log(`✓ Gift card product already exists: ${handle} (${(existing[0] as { id: string }).id})`)
    return
  }

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfileId = (profiles?.[0] as { id?: string } | undefined)?.id
  if (!shippingProfileId) {
    console.error("No shipping profile found. Create a default shipping profile in Medusa Admin first.")
    process.exitCode = 1
    return
  }

  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(createProductsWorkflowId, {
    input: {
      products: [
        {
          title: "Digitale cadeaubon",
          handle,
          subtitle: "Te besteden in de webshop",
          description:
            "Kies een bedrag en personaliseer de bon. De ontvanger krijgt per e-mail een code.",
          is_giftcard: true,
          status: ProductStatus.PUBLISHED,
          discountable: false,
          shipping_profile_id: shippingProfileId,
          options: [{ title: "Type", values: ["Digitale bon"] }],
          variants: [
            {
              title: "Digitale cadeaubon",
              sku: "GIFT-CARD-DIGITAAL",
              options: { Type: "Digitale bon" },
              manage_inventory: false,
              prices: [{ amount: 1500, currency_code: "eur" }],
            },
          ],
        },
      ],
    },
  })

  console.log(`✓ Created gift card product with handle "${handle}"`)
}
