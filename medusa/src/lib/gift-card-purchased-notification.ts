import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { emailContent } from "./email-content"

export type GiftCardPurchasedEmailInput = {
  giftCardId: string
  code: string
  amountCents: number
  recipientName: string
  recipientEmail: string
  senderName?: string | null
  message?: string | null
  orderId: string
  /** Override when sending a corrected code after Salesforce sync */
  idempotencyKey?: string
}

export async function sendGiftCardPurchasedNotification(
  container: MedusaContainer,
  input: GiftCardPurchasedEmailInput
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  let notification: {
    createNotifications: (payload: unknown) => Promise<unknown>
  } | null = null
  try {
    notification = container.resolve(Modules.NOTIFICATION) as {
      createNotifications: (payload: unknown) => Promise<unknown>
    }
  } catch {
    notification = null
  }

  const euros = (input.amountCents / 100).toFixed(2)
  const subject = `Je cadeaubon van €${euros} — code ${input.code}`
  const text = [
    `Hoi ${input.recipientName},`,
    "",
    `Je hebt een digitale cadeaubon ontvangen ter waarde van €${euros}.`,
    `Code: ${input.code}`,
    input.senderName ? `Van: ${input.senderName}` : "",
    input.message ? `Bericht: ${input.message}` : "",
    "",
    "Voer deze code in bij het veld kortingscode of cadeaubon tijdens het afrekenen.",
    "",
    "Veel plezier!",
  ]
    .filter(Boolean)
    .join("\n")

  const idempotencyKey = input.idempotencyKey ?? `gift-card-${input.giftCardId}`

  if (notification) {
    await notification.createNotifications({
      to: input.recipientEmail,
      channel: "email",
      template: "gift-card-purchased",
      data: {
        code: input.code,
        amount_euros: euros,
        name: input.recipientName,
        recipient_name: input.recipientName,
        sender_name: input.senderName,
        message: input.message,
        order_id: input.orderId,
      },
      content: emailContent({ subject, text }),
      trigger_type: "gift-card.purchased",
      resource_id: input.orderId,
      resource_type: "order",
      idempotency_key: idempotencyKey,
    })
  } else {
    logger.info(`[gift-card] (no notification module) ${subject}\n${text}`)
  }
}
