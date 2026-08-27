import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

import { buildWaitlistRegistrationExternalId } from "../../../modules/salesforce-sync/utils/build-registration-id"
import { eventIsFullySoldOut } from "../../../lib/event-sold-out"
import { buildStoreEventDetail } from "../../../lib/store-event-detail"
import { resolveWaitlistCustomer } from "../../../lib/waitlist/resolve-waitlist-customer"
import { resolveWaitlistVaProductId } from "../../../lib/waitlist/resolve-waitlist-va-product"

export type JoinWaitlistInput = {
  handle: string
  quantity: number
  first_name: string
  last_name: string
  email: string
  phone: string
  authenticatedCustomerId?: string | null
}

export type PrepareJoinWaitlistOutput = {
  skipped: boolean
  customerId: string | null
  medusaId: string
  vaProductId: string | null
  quantity: number
  email: string | null
  registrationExternalId: string | null
}

export const prepareJoinWaitlistStep = createStep(
  { name: "prepare-join-waitlist", maxRetries: 2, retryInterval: 5 },
  async (input: JoinWaitlistInput, { container }) => {
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Quantity must be an integer between 1 and 99"
      )
    }

    const event = await buildStoreEventDetail(container, input.handle)
    if (!event) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Event not found")
    }

    const soldOut = eventIsFullySoldOut({
      record_type: event.record_type as string | null | undefined,
      purchase_mode: event.purchase_mode as string | null | undefined,
      min_available_quantity: event.min_available_quantity as number | null | undefined,
      variants: event.variants as Parameters<typeof eventIsFullySoldOut>[0]["variants"],
      bundle_variant_id: event.bundle_variant_id as string | null | undefined,
    })

    if (!soldOut) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Waitlist signup is only available when the activity is fully sold out"
      )
    }

    const { customerId } = await resolveWaitlistCustomer(container, {
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      authenticatedCustomerId: input.authenticatedCustomerId,
    })

    const { vaProductId } = await resolveWaitlistVaProductId(container, input.handle)
    const email = input.email.trim().toLowerCase()
    const registrationExternalId = buildWaitlistRegistrationExternalId(customerId, vaProductId)

    return new StepResponse<PrepareJoinWaitlistOutput>({
      skipped: false,
      customerId,
      medusaId: input.handle,
      vaProductId,
      quantity: input.quantity,
      email,
      registrationExternalId,
    })
  }
)
