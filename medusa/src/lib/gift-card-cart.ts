import pg from "pg"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  addToCartWorkflowId,
  createCartCreditLinesWorkflowId,
  deleteCartCreditLinesWorkflowId,
} from "@medusajs/medusa/core-flows"

import GiftCardModuleService from "../modules/gift-card/service"
import { GIFT_CARD_MODULE } from "../modules/gift-card"
import { computeGiftCardApplication } from "./gift-card-apply-amount"
import { centsToMedusaMajor } from "./medusa-price-to-cents"
import { resolveGiftCardByCode } from "./resolve-gift-card-by-code"
import { giftCardCartLockKey } from "./gift-card-cart-lock"
import { refetchStoreCart, toNumber } from "./store-cart"

export const GIFT_CARD_REFERENCE = "gift_card"
export const GIFT_CARD_PRODUCT_HANDLE_ENV = "GIFT_CARD_PRODUCT_HANDLE"
export const DEFAULT_GIFT_CARD_HANDLE = "digitale-cadeaubon"

const MIN_AMOUNT_CENTS = 500
const MAX_AMOUNT_CENTS = 50_000

/** One gift-card mutation per cart inside this process. */
const cartGiftCardTail = new Map<string, Promise<void>>()

function enqueueCartGiftCardOp<T>(cartId: string, fn: () => Promise<T>): Promise<T> {
  const prev = cartGiftCardTail.get(cartId) ?? Promise.resolve()
  const run = prev.then(fn, fn)
  const settled = run.then(
    () => undefined,
    () => undefined
  )
  cartGiftCardTail.set(cartId, settled)
  void settled.finally(() => {
    if (cartGiftCardTail.get(cartId) === settled) cartGiftCardTail.delete(cartId)
  })
  return run
}

/**
 * Header, cart and checkout each re-apply the cadeaubon on load. Medusa runs as
 * several workers, so an in-memory queue does not stop two of them booking the
 * same code. The advisory lock is held on one DB session for the whole mutation.
 */
async function withCartGiftCardLock<T>(cartId: string, fn: () => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return enqueueCartGiftCardOp(cartId, fn)

  return enqueueCartGiftCardOp(cartId, async () => {
    const client = new pg.Client({ connectionString: url })
    await client.connect()
    const key = giftCardCartLockKey(cartId)
    try {
      await client.query("SELECT pg_advisory_lock($1::bigint)", [key])
      return await fn()
    } finally {
      await client.query("SELECT pg_advisory_unlock($1::bigint)", [key]).catch(() => undefined)
      await client.end()
    }
  })
}

export function giftCardProductHandle(): string {
  return (
    process.env[GIFT_CARD_PRODUCT_HANDLE_ENV]?.trim() || DEFAULT_GIFT_CARD_HANDLE
  )
}

export async function resolveGiftCardVariantId(
  container: MedusaContainer
): Promise<{ variantId: string; productId: string }> {
  const handle = giftCardProductHandle()
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "variants.id", "is_giftcard"],
    filters: { handle },
  })
  const product = products?.[0] as { id?: string; variants?: { id?: string }[] } | undefined
  const variantId = product?.variants?.[0]?.id
  if (!product?.id || !variantId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Gift card product not found (handle: ${handle}). Run: npm run seed:gift-card`
    )
  }
  return { variantId, productId: product.id }
}

export function parseGiftCardRedemptions(
  metadata: Record<string, unknown> | null | undefined
): { code: string; gift_card_id: string }[] {
  const raw = metadata?.gift_card_redemptions
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) => r as { code?: string; gift_card_id?: string })
    .filter((r) => typeof r.code === "string" && typeof r.gift_card_id === "string") as {
    code: string
    gift_card_id: string
  }[]
}

export function cartHasGiftCardPurchase(cart: Record<string, any>): boolean {
  const items: any[] = cart.items ?? []
  return items.some((item) => item.is_giftcard === true || item.metadata?.gift_card)
}

export async function addGiftCardProductToCart(input: {
  container: MedusaContainer
  cartId: string
  amountCents: number
  recipient_name: string
  recipient_email: string
  message?: string
  sender_name?: string
}) {
  const {
    container,
    cartId,
    amountCents,
    recipient_name,
    recipient_email,
    message,
    sender_name,
  } = input

  if (
    !Number.isInteger(amountCents) ||
    amountCents < MIN_AMOUNT_CENTS ||
    amountCents > MAX_AMOUNT_CENTS
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Amount must be between €${MIN_AMOUNT_CENTS / 100} and €${MAX_AMOUNT_CENTS / 100} (whole euros as cents)`
    )
  }

  const { variantId } = await resolveGiftCardVariantId(container)
  const we = container.resolve(Modules.WORKFLOW_ENGINE)

  await we.run(addToCartWorkflowId, {
    input: {
      cart_id: cartId,
      items: [
        {
          variant_id: variantId,
          quantity: 1,
          // Cart unit_price is major EUR; amount_cents stays on metadata for issuance.
          unit_price: centsToMedusaMajor(amountCents),
          is_tax_inclusive: true,
          requires_shipping: false,
          is_giftcard: true,
          metadata: {
            gift_card: {
              recipient_name,
              recipient_email,
              message: message ?? null,
              sender_name: sender_name ?? null,
              amount_cents: amountCents,
            },
          },
        },
      ],
    },
  })

  return refetchStoreCart(container, cartId)
}

/**
 * Remove all gift-card credit lines, release reserves, clear metadata list; then re-apply each code.
 */
export async function syncGiftCardCreditLines(
  container: MedusaContainer,
  cartId: string
): Promise<Record<string, any>> {
  return withCartGiftCardLock(cartId, () => syncGiftCardCreditLinesInner(container, cartId))
}

async function syncGiftCardCreditLinesInner(
  container: MedusaContainer,
  cartId: string
): Promise<Record<string, any>> {
  let cart = await refetchStoreCart(container, cartId)
  const redemptions = parseGiftCardRedemptions(cart.metadata)

  if (redemptions.length === 0) {
    return cart
  }

  await stripGiftCardCredits(container, cartId)
  cart = await refetchStoreCart(container, cartId)

  const meta = { ...(cart.metadata ?? {}) }
  meta.gift_card_redemptions = [] as { code: string; gift_card_id: string }[]
  await container.resolve(Modules.CART).updateCarts(cartId, { metadata: meta })
  cart = await refetchStoreCart(container, cartId)

  for (const r of redemptions) {
    const result = await applyGiftCardCodeInner(container, cartId, r.code, {
      skipDuplicateCheck: true,
    })
    cart = result.cart
  }

  return collapseDuplicateGiftCardCredits(container, cartId)
}

/** Drop stacked credits for the same code left by overlapping refreshes. Keeps the first line. */
async function collapseDuplicateGiftCardCredits(
  container: MedusaContainer,
  cartId: string
): Promise<Record<string, any>> {
  const cart = await refetchStoreCart(container, cartId)
  const creditLines: any[] = cart.credit_lines ?? []
  const lines = creditLines.filter((l) => l.reference === GIFT_CARD_REFERENCE)
  const seen = new Set<string>()
  const extraIds: string[] = []
  const extraCards = new Set<string>()
  for (const line of lines) {
    const code = String((line.metadata as { code?: string } | null)?.code ?? line.id)
    if (seen.has(code)) {
      if (line.id) extraIds.push(line.id)
      const giftCardId = (line.metadata as { gift_card_id?: string } | null)?.gift_card_id
      if (giftCardId) extraCards.add(giftCardId)
    } else {
      seen.add(code)
    }
  }
  if (!extraIds.length) return cart

  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(deleteCartCreditLinesWorkflowId, { input: { id: extraIds } })
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>
  for (const giftCardId of extraCards) {
    const reserves = await gift.listGiftCardTransactions({
      gift_card_id: giftCardId,
      cart_id: cartId,
      type: "reserve",
    })
    for (const row of reserves.slice(1)) {
      await gift.deleteGiftCardTransactions(row.id)
    }
  }
  return refetchStoreCart(container, cartId)
}

async function stripGiftCardCredits(container: MedusaContainer, cartId: string) {
  const cart = await refetchStoreCart(container, cartId)
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>
  const lines: any[] = cart.credit_lines ?? []
  const toRemove = lines.filter((l) => l.reference === GIFT_CARD_REFERENCE)
  const ids = toRemove.map((l) => l.id).filter(Boolean)
  if (ids.length) {
    const we = container.resolve(Modules.WORKFLOW_ENGINE)
    await we.run(deleteCartCreditLinesWorkflowId, { input: { id: ids } })
  }
  for (const line of toRemove) {
    const mid = line.metadata as { gift_card_id?: string } | null
    if (mid?.gift_card_id) {
      await gift.releaseReservationsForCart(mid.gift_card_id, cartId)
    }
  }
}

/** Release gift-card credit lines and clear saved redemption metadata on a cart. */
export async function clearGiftCardCreditsFromCart(
  container: MedusaContainer,
  cartId: string
): Promise<void> {
  await stripGiftCardCredits(container, cartId)
  const cart = await refetchStoreCart(container, cartId)
  const meta = { ...(cart.metadata ?? {}) }
  meta.gift_card_redemptions = [] as { code: string; gift_card_id: string }[]
  await container.resolve(Modules.CART).updateCarts(cartId, { metadata: meta })
}

export async function applyGiftCardCode(
  container: MedusaContainer,
  cartId: string,
  rawCode: string,
  opts?: { skipDuplicateCheck?: boolean }
): Promise<Record<string, any>> {
  return withCartGiftCardLock(cartId, () =>
    applyGiftCardCodeInner(container, cartId, rawCode, opts)
  )
}

async function applyGiftCardCodeInner(
  container: MedusaContainer,
  cartId: string,
  rawCode: string,
  opts?: { skipDuplicateCheck?: boolean }
): Promise<Record<string, any>> {
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>
  const code = gift.normalizeCode(rawCode)

  let cart = await refetchStoreCart(container, cartId)

  if (cartHasGiftCardPurchase(cart)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You cannot apply a gift card balance while purchasing a gift card"
    )
  }

  const card = await resolveGiftCardByCode(container, code)
  if (!card) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Gift card code not found")
  }

  await gift.assertCardRedeemable(card as any, cart.currency_code)

  const reservedOthers = await gift.sumReservedAmount(card.id, cartId)
  const totalDue = toNumber(cart.total)
  if (totalDue <= 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "There is no remaining amount to pay on this cart"
    )
  }

  const { appliedMajor, appliedCents, remainingCents } = computeGiftCardApplication({
    balanceCents: Number(card.balance),
    reservedCents: reservedOthers,
    cartTotalMajor: totalDue,
  })

  if (appliedCents <= 0) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Gift card has no available balance")
  }

  if (!opts?.skipDuplicateCheck) {
    const existing = parseGiftCardRedemptions(cart.metadata)
    if (existing.some((e) => e.code === code)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This gift card is already applied to the cart"
      )
    }
  }

  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(createCartCreditLinesWorkflowId, {
    input: [
      {
        cart_id: cartId,
        amount: appliedMajor,
        reference: GIFT_CARD_REFERENCE,
        reference_id: card.id,
        metadata: {
          gift_card_id: card.id,
          code,
          cart_id: cartId,
        },
      },
    ],
  })

  await gift.reserveForCart({
    giftCardId: card.id,
    cartId,
    amount: appliedCents,
  })

  const meta = { ...(cart.metadata ?? {}) }
  const reds = parseGiftCardRedemptions(meta).filter((r) => r.code !== code)
  reds.push({ code, gift_card_id: card.id })
  meta.gift_card_redemptions = reds
  await container.resolve(Modules.CART).updateCarts(cartId, { metadata: meta })

  cart = await refetchStoreCart(container, cartId)
  return {
    cart,
    applied_amount: appliedMajor,
    remaining_balance: centsToMedusaMajor(remainingCents),
  }
}

export async function removeGiftCardCode(
  container: MedusaContainer,
  cartId: string,
  rawCode: string
): Promise<Record<string, any>> {
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>
  const code = gift.normalizeCode(rawCode)
  const cart = await refetchStoreCart(container, cartId)
  const lines: any[] = cart.credit_lines ?? []
  const line = lines.find(
    (l) =>
      l.reference === GIFT_CARD_REFERENCE &&
      (l.metadata as any)?.code === code
  )
  if (!line) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Gift card not applied to this cart")
  }
  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(deleteCartCreditLinesWorkflowId, { input: { id: [line.id] } })
  const mid = line.metadata as { gift_card_id?: string }
  if (mid?.gift_card_id) {
    await gift.releaseReservationsForCart(mid.gift_card_id, cartId)
  }
  const meta = { ...(cart.metadata ?? {}) }
  const reds = parseGiftCardRedemptions(meta).filter((r) => r.code !== code)
  meta.gift_card_redemptions = reds
  await container.resolve(Modules.CART).updateCarts(cartId, { metadata: meta })
  return refetchStoreCart(container, cartId)
}

export { MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS }
