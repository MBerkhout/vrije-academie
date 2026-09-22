import {
  addToCartWorkflowId,
  createCartWorkflow,
  deleteLineItemsWorkflowId,
  transferCartCustomerWorkflowId,
  updateCartPromotionsWorkflowId,
  updateLineItemInCartWorkflowId,
} from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PromotionActions,
} from "@medusajs/framework/utils"

import { buildEventLineItemMetadata, stripReservedEventLineItemMetadata } from "./event-line-item-metadata"
import {
  clearGiftCardCreditsFromCart,
  parseGiftCardRedemptions,
  syncGiftCardCreditLines,
} from "./gift-card-cart"
import { ensureCartTaxPreview } from "./ensure-cart-tax-preview"
import { refetchStoreCart } from "./store-cart"
import { isVathuisProductMetadata } from "../modules/salesforce-sync/utils/vathuis-metadata"
import { vathuisAddToCartPlan } from "./vathuis-cart-quantity"

type CartPromotionRow = {
  code?: string | null
  is_automatic?: boolean | null
}

type CartLineRow = {
  id: string
  variant_id?: string | null
  quantity?: number | null
  unit_price?: number | null
  is_giftcard?: boolean | null
  metadata?: Record<string, unknown> | null
  variant?: {
    product?: { metadata?: Record<string, unknown> | null } | null
  } | null
}

type CartRow = {
  id: string
  customer_id?: string | null
  created_at?: string | Date | null
  completed_at?: string | Date | null
  metadata?: Record<string, unknown> | null
  promotions?: CartPromotionRow[] | null
  items?: CartLineRow[] | null
}

export function isGiftCardPurchaseLine(item: {
  is_giftcard?: boolean | null
  metadata?: Record<string, unknown> | null
}): boolean {
  if (item.is_giftcard === true) return true
  const meta = item.metadata
  return meta != null && typeof meta === "object" && meta.gift_card != null
}

export function isOpenCart(cart: { completed_at?: string | Date | null }): boolean {
  if (cart.completed_at == null) return true
  if (typeof cart.completed_at === "string") return cart.completed_at.trim() === ""
  return false
}

export function pickCanonicalCartId(
  carts: { id: string; created_at?: string | Date | null }[]
): string | null {
  if (!carts.length) return null
  const sorted = [...carts].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    if (aTime !== bTime) return aTime - bTime
    return a.id.localeCompare(b.id)
  })
  return sorted[0]?.id ?? null
}

export function planCatalogLineMerge(input: {
  isVathuis: boolean
  sourceQuantity: number
  canonicalQuantity: number
}):
  | { action: "add"; quantity: number }
  | { action: "update"; quantity: number }
  | { action: "skip" } {
  const plan = vathuisAddToCartPlan({
    isVathuis: input.isVathuis,
    alreadyInCart: input.isVathuis && input.canonicalQuantity > 0,
    requestedQuantity: input.sourceQuantity,
  })
  if (plan.action === "skip") return { action: "skip" }
  if (input.canonicalQuantity <= 0) {
    return { action: "add", quantity: plan.quantity }
  }
  return {
    action: "update",
    quantity: input.canonicalQuantity + plan.quantity,
  }
}

export function unionPromoCodes(carts: { promotions?: CartPromotionRow[] | null }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const cart of carts) {
    for (const promo of cart.promotions ?? []) {
      if (promo.is_automatic === true) continue
      const code = promo.code?.trim()
      if (!code) continue
      const key = code.toUpperCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(code)
    }
  }
  return out
}

export function unionGiftCardRedemptions(
  carts: { metadata?: Record<string, unknown> | null }[]
): { code: string; gift_card_id: string }[] {
  const seen = new Set<string>()
  const out: { code: string; gift_card_id: string }[] = []
  for (const cart of carts) {
    for (const row of parseGiftCardRedemptions(cart.metadata)) {
      const key = row.code.toUpperCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(row)
    }
  }
  return out
}

function canonicalQuantityByVariant(items: CartLineRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    if (!item.variant_id || isGiftCardPurchaseLine(item)) continue
    map.set(item.variant_id, (map.get(item.variant_id) ?? 0) + Number(item.quantity ?? 0))
  }
  return map
}

async function loadCustomerCarts(
  container: MedusaContainer,
  customerId: string
): Promise<CartRow[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "customer_id",
      "created_at",
      "completed_at",
      "metadata",
      "promotions.code",
      "promotions.is_automatic",
      "items.id",
      "items.variant_id",
      "items.quantity",
      "items.unit_price",
      "items.is_giftcard",
      "items.metadata",
      "items.variant.product.metadata",
    ],
    filters: { customer_id: customerId },
  })
  return ((data ?? []) as CartRow[]).filter(isOpenCart)
}

async function loadCartById(
  container: MedusaContainer,
  cartId: string
): Promise<CartRow | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "customer_id",
      "created_at",
      "completed_at",
      "metadata",
      "promotions.code",
      "promotions.is_automatic",
      "items.id",
      "items.variant_id",
      "items.quantity",
      "items.unit_price",
      "items.is_giftcard",
      "items.metadata",
      "items.variant.product.metadata",
    ],
    filters: { id: cartId },
  })
  const cart = (data?.[0] as CartRow | undefined) ?? null
  if (!cart || !isOpenCart(cart)) return null
  return cart
}

async function transferCartToCustomer(
  container: MedusaContainer,
  cartId: string,
  customerId: string
): Promise<void> {
  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(transferCartCustomerWorkflowId, {
    input: {
      id: cartId,
      customer_id: customerId,
    },
  })
}

async function createCustomerCart(
  container: MedusaContainer,
  customerId: string
): Promise<string> {
  const { result } = await createCartWorkflow(container).run({
    input: { customer_id: customerId },
  })
  return result.id
}

async function addCatalogLineToCart(
  container: MedusaContainer,
  cartId: string,
  item: CartLineRow,
  quantity: number
): Promise<void> {
  const variantId = item.variant_id
  if (!variantId) return

  const eventMetadata = await buildEventLineItemMetadata(container, variantId)
  const safeMetadata = stripReservedEventLineItemMetadata(item.metadata)
  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(addToCartWorkflowId, {
    input: {
      cart_id: cartId,
      items: [
        {
          variant_id: variantId,
          quantity,
          metadata: {
            ...safeMetadata,
            ...eventMetadata,
          },
        },
      ],
    },
  })
}

async function addGiftCardPurchaseLineToCart(
  container: MedusaContainer,
  cartId: string,
  item: CartLineRow
): Promise<void> {
  const variantId = item.variant_id
  if (!variantId) return
  const unitPrice = Number(item.unit_price ?? 0)
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return

  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(addToCartWorkflowId, {
    input: {
      cart_id: cartId,
      items: [
        {
          variant_id: variantId,
          quantity: 1,
          unit_price: unitPrice,
          is_tax_inclusive: true,
          requires_shipping: false,
          is_giftcard: true,
          metadata: item.metadata ?? {},
        },
      ],
    },
  })
}

async function updateCatalogLineQuantity(
  container: MedusaContainer,
  cartId: string,
  lineId: string,
  quantity: number
): Promise<void> {
  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(updateLineItemInCartWorkflowId, {
    input: {
      cart_id: cartId,
      item_id: lineId,
      update: { quantity },
    },
  })
}

async function emptyCartLines(container: MedusaContainer, cartId: string): Promise<void> {
  const cart = await refetchStoreCart(container, cartId)
  const ids = (cart.items ?? []).map((item: { id?: string }) => item.id).filter(Boolean) as string[]
  if (!ids.length) return
  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(deleteLineItemsWorkflowId, {
    input: {
      cart_id: cartId,
      ids,
    },
  })
}

async function mergeCartLinesIntoCanonical(
  container: MedusaContainer,
  canonicalId: string,
  sourceCart: CartRow
): Promise<void> {
  let canonical = await loadCartById(container, canonicalId)
  if (!canonical) return

  let quantities = canonicalQuantityByVariant(canonical.items ?? [])
  const lineIdByVariant = new Map<string, string>()
  for (const item of canonical.items ?? []) {
    if (!item.variant_id || isGiftCardPurchaseLine(item)) continue
    lineIdByVariant.set(item.variant_id, item.id)
  }

  for (const item of sourceCart.items ?? []) {
    try {
      if (isGiftCardPurchaseLine(item)) {
        await addGiftCardPurchaseLineToCart(container, canonicalId, item)
        continue
      }

      const variantId = item.variant_id
      if (!variantId) continue

      const isVathuis = isVathuisProductMetadata(item.variant?.product?.metadata)
      const sourceQuantity = Number(item.quantity ?? 1)
      const canonicalQuantity = quantities.get(variantId) ?? 0
      const plan = planCatalogLineMerge({
        isVathuis,
        sourceQuantity,
        canonicalQuantity,
      })

      if (plan.action === "skip") continue

      if (plan.action === "add") {
        await addCatalogLineToCart(container, canonicalId, item, plan.quantity)
        quantities.set(variantId, plan.quantity)
        canonical = await loadCartById(container, canonicalId)
        const added = (canonical?.items ?? []).find(
          (row) => row.variant_id === variantId && !isGiftCardPurchaseLine(row)
        )
        if (added?.id) lineIdByVariant.set(variantId, added.id)
        continue
      }

      const lineId = lineIdByVariant.get(variantId)
      if (!lineId) continue
      await updateCatalogLineQuantity(container, canonicalId, lineId, plan.quantity)
      quantities.set(variantId, plan.quantity)
    } catch {
      /* skip lines that cannot be added (sold out, past session, etc.) */
    }
  }
}

async function applyMergedCartAdjustments(
  container: MedusaContainer,
  canonicalId: string,
  carts: CartRow[]
): Promise<Record<string, unknown>> {
  const promoCodes = unionPromoCodes(carts)
  const giftRedemptions = unionGiftCardRedemptions(carts)
  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  const cartModule = container.resolve(Modules.CART) as {
    updateCarts: (id: string, data: Record<string, unknown>) => Promise<unknown>
  }

  if (promoCodes.length) {
    await we.run(updateCartPromotionsWorkflowId, {
      input: {
        cart_id: canonicalId,
        promo_codes: promoCodes,
        action: PromotionActions.REPLACE,
        force_refresh_payment_collection: true,
      },
    })
  }

  const cart = await refetchStoreCart(container, canonicalId)
  const meta = { ...(cart.metadata ?? {}), gift_card_redemptions: giftRedemptions }
  await cartModule.updateCarts(canonicalId, { metadata: meta })

  if (giftRedemptions.length) {
    return syncGiftCardCreditLines(container, canonicalId)
  }

  return refetchStoreCart(container, canonicalId)
}

async function clearSourceCart(container: MedusaContainer, cartId: string): Promise<void> {
  try {
    await clearGiftCardCreditsFromCart(container, cartId)
  } catch {
    /* best-effort */
  }
  await emptyCartLines(container, cartId)
}

/**
 * Merge all open carts for a logged-in customer into the oldest cart.
 * Optionally transfers a guest/local cart first.
 */
export async function syncAccountCarts(
  container: MedusaContainer,
  customerId: string,
  localCartId?: string | null
): Promise<Record<string, unknown>> {
  if (localCartId) {
    const local = await loadCartById(container, localCartId)
    if (local) {
      if (local.customer_id && local.customer_id !== customerId) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Cart belongs to another customer"
        )
      }
      if (!local.customer_id) {
        await transferCartToCustomer(container, localCartId, customerId)
      }
    }
  }

  let carts = await loadCustomerCarts(container, customerId)
  if (!carts.length) {
    const createdId = await createCustomerCart(container, customerId)
    await ensureCartTaxPreview(container, createdId)
    return refetchStoreCart(container, createdId)
  }

  const canonicalId = pickCanonicalCartId(carts)
  if (!canonicalId) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "No open cart to sync")
  }

  const sourceCarts = carts.filter((cart) => cart.id !== canonicalId)
  const cartsForAdjustments = [...carts]

  for (const source of sourceCarts) {
    await mergeCartLinesIntoCanonical(container, canonicalId, source)
  }

  await applyMergedCartAdjustments(container, canonicalId, cartsForAdjustments)

  for (const source of sourceCarts) {
    await clearSourceCart(container, source.id)
  }

  await ensureCartTaxPreview(container, canonicalId)
  return refetchStoreCart(container, canonicalId)
}
