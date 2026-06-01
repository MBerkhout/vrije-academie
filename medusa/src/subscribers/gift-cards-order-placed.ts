import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import GiftCardModuleService from "../modules/gift-card/service"
import { GIFT_CARD_MODULE } from "../modules/gift-card"
import { GIFT_CARD_REFERENCE } from "../lib/gift-card-cart"

/**
 * On order.placed: issue gift cards for purchased lines with metadata.gift_card,
 * finalize balance deduction for applied gift-card credit lines, notify recipients.
 */
export default async function giftCardsOnOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = data.id
  const orderModule = container.resolve(Modules.ORDER)
  const gift = container.resolve(GIFT_CARD_MODULE) as InstanceType<typeof GiftCardModuleService>

  let notification: any
  try {
    notification = container.resolve(Modules.NOTIFICATION)
  } catch {
    notification = null
  }

  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items", "credit_lines"],
  })

  const items = order.items ?? []
  for (const line of items) {
    const meta = line.metadata as { gift_card?: Record<string, unknown> } | null
    const gc = meta?.gift_card as
      | {
          recipient_name?: string
          recipient_email?: string
          message?: string | null
          sender_name?: string | null
          amount_cents?: number
        }
      | undefined
    if (!gc?.recipient_email || !gc?.recipient_name) {
      continue
    }

    const unit = typeof line.unit_price === "number" ? line.unit_price : Number(line.unit_price ?? 0)
    const qty = typeof line.quantity === "number" ? line.quantity : Number(line.quantity ?? 1)
    const amountCents =
      typeof gc.amount_cents === "number" && Number.isFinite(gc.amount_cents)
        ? gc.amount_cents
        : Math.round(unit * qty)

    try {
      const card = await gift.createForOrderLine({
        orderId,
        lineItemId: line.id,
        amountCents,
        currencyCode: order.currency_code,
        meta: {
          recipient_name: gc.recipient_name,
          recipient_email: gc.recipient_email,
          message: gc.message ?? null,
          sender_name: gc.sender_name ?? null,
          amount_cents: amountCents,
        },
      })

      const euros = (amountCents / 100).toFixed(2)
      const subject = `Je cadeaubon van €${euros} — code ${card.code}`
      const text = [
        `Hoi ${gc.recipient_name},`,
        "",
        `Je hebt een digitale cadeaubon ontvangen ter waarde van €${euros}.`,
        `Code: ${card.code}`,
        gc.sender_name ? `Van: ${gc.sender_name}` : "",
        gc.message ? `Bericht: ${gc.message}` : "",
        "",
        "Voer deze code in bij het veld kortingscode of cadeaubon tijdens het afrekenen.",
        "",
        "Veel plezier!",
      ]
        .filter(Boolean)
        .join("\n")

      if (notification) {
        await notification.createNotifications({
          to: gc.recipient_email,
          channel: "email",
          template: "gift-card-purchased",
          data: {
            code: card.code,
            amount_euros: euros,
            /** Alias for notification templates that use `{name}` / `{{name}}` */
            name: gc.recipient_name,
            recipient_name: gc.recipient_name,
            sender_name: gc.sender_name,
            message: gc.message,
            order_id: orderId,
          },
          content: {
            subject,
            text,
          },
          trigger_type: "gift-card.purchased",
          resource_id: orderId,
          resource_type: "order",
          idempotency_key: `gift-card-${card.id}`,
        })
      } else {
        logger.info(`[gift-card] (no notification module) ${subject}\n${text}`)
      }
    } catch (err) {
      logger.error(`[gift-card] issue failed for line ${line.id}: ${(err as Error).message}`)
    }
  }

  const creditLines = order.credit_lines ?? []
  for (const cl of creditLines) {
    if (cl.reference !== GIFT_CARD_REFERENCE) {
      continue
    }
    const m = cl.metadata as {
      gift_card_id?: string
      code?: string
      cart_id?: string
    } | null
    if (!m?.gift_card_id || !m.cart_id) {
      logger.warn(`[gift-card] credit line ${cl.id} missing gift_card metadata`)
      continue
    }
    const amount = typeof cl.amount === "number" ? cl.amount : Number(cl.amount ?? 0)
    if (amount <= 0) {
      continue
    }
    try {
      await gift.finalizeRedemption({
        giftCardId: m.gift_card_id,
        cartId: m.cart_id,
        orderId,
        amount,
      })
    } catch (err) {
      logger.error(
        `[gift-card] finalize redemption failed (${m.code}): ${(err as Error).message}`
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
