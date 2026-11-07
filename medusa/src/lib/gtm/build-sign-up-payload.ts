import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export type GtmSignUpPayload = {
  event: "sign_up"
  method: string
  event_id?: string
  user_data: {
    email?: string
    phone_number?: string
    first_name?: string
    last_name?: string
  }
}

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

const ANALYTICS_SIGN_UP_EVENT_ID = "analytics_sign_up_event_id"

export async function buildGtmSignUpPayload(
  container: MedusaContainer,
  customerId: string
): Promise<GtmSignUpPayload> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "email", "phone", "first_name", "last_name", "metadata"],
  })
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>

  const userData: GtmSignUpPayload["user_data"] = {}
  const email = nonEmpty(customer.email)
  if (email) userData.email = email
  const phone = nonEmpty(customer.phone)
  if (phone) userData.phone_number = phone
  const first = nonEmpty(customer.first_name)
  if (first) userData.first_name = first
  const last = nonEmpty(customer.last_name)
  if (last) userData.last_name = last

  const eventId = nonEmpty(metadata[ANALYTICS_SIGN_UP_EVENT_ID])

  return {
    event: "sign_up",
    method: "email",
    ...(eventId ? { event_id: eventId } : {}),
    user_data: userData,
  }
}
