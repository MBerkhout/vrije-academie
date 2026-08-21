import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type OrderPaymentInfo = {
  mollieTransactionId: string | null
  paymentMethod: string
}

const PROVIDER_TO_SF_METHOD: Record<string, string> = {
  ideal: "IDEAL",
  "pp_mollie-ideal_mollie": "IDEAL",
  card: "CREDITCARD",
  "pp_mollie-card_mollie": "CREDITCARD",
  bancontact: "BANCONTACT",
  "pp_mollie-bancontact_mollie": "BANCONTACT",
  paypal: "PAYPAL",
  "pp_mollie-paypal_mollie": "PAYPAL",
  giftcard: "GIFTCARD",
  "pp_mollie-giftcard_mollie": "GIFTCARD",
  hosted: "IDEAL",
  "pp_mollie-hosted-checkout_mollie": "IDEAL",
  klarna: "KLARNA",
  "pp_mollie-klarna_mollie": "KLARNA",
}

export function mapProviderToSfMethod(providerId: string | null | undefined): string {
  if (!providerId) return "IDEAL"
  const lower = providerId.toLowerCase()
  for (const [key, value] of Object.entries(PROVIDER_TO_SF_METHOD)) {
    if (lower.includes(key.replace("pp_mollie-", "").replace("_mollie", ""))) {
      return value
    }
  }
  return "IDEAL"
}

function extractMollieId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (typeof d.id === "string" && d.id.startsWith("tr_")) return d.id
  if (typeof d.payment_id === "string" && d.payment_id.startsWith("tr_")) {
    return d.payment_id
  }
  return null
}

export async function resolveOrderPayment(
  container: MedusaContainer,
  orderId: string,
  orderTotalCents: number
): Promise<OrderPaymentInfo> {
  if (orderTotalCents <= 0) {
    return { mollieTransactionId: null, paymentMethod: "GRATIS" }
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: rows } = await query.graph({
    entity: "order",
    fields: [
      "payment_collections.id",
      "payment_collections.payments.id",
      "payment_collections.payments.provider_id",
      "payment_collections.payments.data",
      "payment_collections.payments.captured_at",
    ],
    filters: { id: orderId },
  })

  const order = rows?.[0] as
    | {
        payment_collections?: Array<{
          payments?: Array<{
            provider_id?: string
            data?: unknown
            captured_at?: string | null
          }>
        }>
      }
    | undefined

  const payments =
    order?.payment_collections?.flatMap((pc) => pc.payments ?? []) ?? []
  const captured =
    payments.find((p) => p.captured_at) ?? payments[payments.length - 1]

  return {
    mollieTransactionId: extractMollieId(captured?.data),
    paymentMethod: mapProviderToSfMethod(captured?.provider_id),
  }
}
