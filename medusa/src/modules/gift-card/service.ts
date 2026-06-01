import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { randomBytes } from "crypto"

import { GiftCard } from "./models/gift-card"
import { GiftCardTransaction } from "./models/gift-card-transaction"

const ACTIVE = "active"
const DEPLETED = "depleted"
const CANCELLED = "cancelled"
const EXPIRED = "expired"
const TX_RESERVE = "reserve"
const TX_REDEMPTION = "redemption"
const TX_REFUND = "refund"

export type GiftCardPurchaseMetadata = {
  recipient_name: string
  recipient_email: string
  message?: string | null
  sender_name?: string | null
  amount_cents: number
}

class GiftCardModuleService extends MedusaService({
  GiftCard,
  GiftCardTransaction,
}) {
  normalizeCode(raw: string): string {
    const t = raw.trim().toUpperCase()
    if (!t.startsWith("GIFT-")) {
      return `GIFT-${t.replace(/^GIFT-?/i, "")}`
    }
    return t
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 12; i++) {
      const suffix = randomBytes(4).toString("hex").toUpperCase()
      const code = `GIFT-${suffix}`
      const existing = await this.listGiftCards({ code })
      if (!existing.length) {
        return code
      }
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Could not generate gift card code")
  }

  async getByCode(rawCode: string) {
    const code = this.normalizeCode(rawCode)
    const rows = await this.listGiftCards({ code })
    return rows[0] ?? null
  }

  async sumReservedAmount(giftCardId: string, excludeCartId?: string): Promise<number> {
    const filters: Record<string, unknown> = {
      gift_card_id: giftCardId,
      type: TX_RESERVE,
    }
    const rows = await this.listGiftCardTransactions(filters)
    return rows
      .filter((r) => (excludeCartId ? r.cart_id !== excludeCartId : true))
      .reduce((s, r) => s + Number(r.amount ?? 0), 0)
  }

  availableBalance(giftCard: { balance: number }, giftCardId: string, excludeCartId?: string): Promise<number> {
    return this.sumReservedAmount(giftCardId, excludeCartId).then(
      (reserved) => Number(giftCard.balance) - reserved
    )
  }

  async assertCardRedeemable(card: {
    id: string
    status: string
    balance: number
    currency_code: string
    expires_at: string | null
  }, cartCurrency: string) {
    if (card.status !== ACTIVE) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Gift card is not active (status: ${card.status})`
      )
    }
    if (card.currency_code.toLowerCase() !== cartCurrency.toLowerCase()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Gift card currency does not match cart currency"
      )
    }
    if (card.expires_at) {
      const exp = new Date(card.expires_at)
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        await this.updateGiftCards({ id: card.id, status: EXPIRED })
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Gift card has expired")
      }
    }
    if (Number(card.balance) <= 0) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Gift card has no balance")
    }
  }

  async reserveForCart(input: {
    giftCardId: string
    cartId: string
    amount: number
  }) {
    const { giftCardId, cartId, amount } = input
    const cards = await this.listGiftCards({ id: giftCardId })
    const card = cards[0]
    if (!card) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Gift card not found")
    }
    const reservedOthers = await this.sumReservedAmount(giftCardId, cartId)
    const available = Number(card.balance) - reservedOthers
    if (amount > available) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Gift card balance is insufficient (including other open carts)"
      )
    }
    await this.createGiftCardTransactions({
      gift_card_id: giftCardId,
      cart_id: cartId,
      type: TX_RESERVE,
      amount,
      order_id: null,
      note: null,
    })
  }

  async releaseReservationsForCart(giftCardId: string, cartId: string) {
    const rows = await this.listGiftCardTransactions({
      gift_card_id: giftCardId,
      cart_id: cartId,
      type: TX_RESERVE,
    })
    for (const r of rows) {
      await this.deleteGiftCardTransactions(r.id)
    }
  }

  async createForOrderLine(input: {
    orderId: string
    lineItemId: string
    amountCents: number
    currencyCode: string
    meta: GiftCardPurchaseMetadata
  }) {
    const { orderId, lineItemId, amountCents, currencyCode, meta } = input

    const existing = await this.listGiftCards({
      purchased_by_order_id: orderId,
      source_line_item_id: lineItemId,
    })
    if (existing.length > 0) {
      return existing[0]
    }

    const code = await this.generateUniqueCode()
    const years = Number(process.env.GIFT_CARD_EXPIRY_YEARS ?? "2")
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + years)

    const [created] = await this.createGiftCards([
      {
        code,
        initial_value: amountCents,
        balance: amountCents,
        currency_code: currencyCode.toLowerCase(),
        status: ACTIVE,
        recipient_name: meta.recipient_name,
        recipient_email: meta.recipient_email,
        sender_name: meta.sender_name ?? null,
        message: meta.message ?? null,
        purchased_by_order_id: orderId,
        source_line_item_id: lineItemId,
        expires_at: expires.toISOString(),
      },
    ])

    await this.createGiftCardTransactions({
      gift_card_id: created.id,
      cart_id: null,
      type: "issuance",
      amount: amountCents,
      order_id: orderId,
      note: "issued_on_purchase",
    })

    return created
  }

  async finalizeRedemption(input: {
    giftCardId: string
    cartId: string
    orderId: string
    amount: number
  }) {
    const { giftCardId, cartId, orderId, amount } = input
    const already = await this.listGiftCardTransactions({
      gift_card_id: giftCardId,
      order_id: orderId,
      type: TX_REDEMPTION,
    })
    if (already.length > 0) {
      return
    }
    const cards = await this.listGiftCards({ id: giftCardId })
    const card = cards[0]
    if (!card) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Gift card not found")
    }
    if (Number(card.balance) < amount) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Gift card balance lower than applied redemption"
      )
    }
    await this.releaseReservationsForCart(giftCardId, cartId)
    const nextBalance = Number(card.balance) - amount
    await this.updateGiftCards({
      id: giftCardId,
      balance: nextBalance,
      status: nextBalance <= 0 ? DEPLETED : ACTIVE,
    })
    await this.createGiftCardTransactions({
      gift_card_id: giftCardId,
      cart_id: null,
      type: TX_REDEMPTION,
      amount,
      order_id: orderId,
      note: null,
    })
  }

  async reverseRedemptionsForOrder(orderId: string) {
    const refundCandidates = await this.listGiftCardTransactions({
      order_id: orderId,
      type: TX_REFUND,
    })
    if (refundCandidates.some((t) => t.note === "order_canceled")) {
      return
    }
    const redemptions = await this.listGiftCardTransactions({
      order_id: orderId,
      type: TX_REDEMPTION,
    })
    for (const tx of redemptions) {
      const cards = await this.listGiftCards({ id: tx.gift_card_id })
      const card = cards[0]
      if (!card) continue
      const refundAmount = Number(tx.amount)
      const nextBalance = Number(card.balance) + refundAmount
      await this.updateGiftCards({
        id: card.id,
        balance: nextBalance,
        status: nextBalance > 0 ? ACTIVE : card.status,
      })
      await this.createGiftCardTransactions({
        gift_card_id: card.id,
        cart_id: null,
        type: TX_REFUND,
        amount: refundAmount,
        order_id: orderId,
        note: "order_canceled",
      })
    }
  }

  async cancelIssuedCardsForOrder(orderId: string) {
    const issued = await this.listGiftCards({ purchased_by_order_id: orderId })
    for (const c of issued) {
      if (c.status === ACTIVE && Number(c.balance) === Number(c.initial_value)) {
        await this.updateGiftCards({ id: c.id, status: CANCELLED, balance: 0 })
        await this.createGiftCardTransactions({
          gift_card_id: c.id,
          cart_id: null,
          type: TX_REFUND,
          amount: Number(c.initial_value),
          order_id: orderId,
          note: "purchase_order_canceled",
        })
      }
    }
  }
}

export default GiftCardModuleService
