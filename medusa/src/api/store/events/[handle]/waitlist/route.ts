import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { joinEventWaitlist } from "../../../../../lib/waitlist/join-event-waitlist"
import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"

/**
 * POST /store/events/:handle/waitlist
 * Body: { quantity, first_name, last_name, email, phone, variant_id? }
 */
export async function POST(req: MedusaStoreRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle as string
  const body = (req.body ?? {}) as {
    quantity?: number
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    variant_id?: string
  }

  try {
    const sync = req.scope.resolve("salesforceSync") as InstanceType<
      typeof SalesforceSyncModuleService
    >
    if (!(await sync.isIntegrationReady())) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Waitlist signup is temporarily unavailable"
      )
    }

    const registration = await joinEventWaitlist(req.scope, {
      handle,
      quantity: Number(body.quantity),
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      variant_id: body.variant_id ?? null,
      authenticatedCustomerId: req.auth_context?.actor_id ?? null,
    })

    if (!registration.salesforceRegistrationId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Waitlist signup could not be completed"
      )
    }

    res.json({ success: true })
  } catch (err) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error: (msg: string) => void
    }
    if (err instanceof MedusaError) {
      const status =
        err.type === MedusaError.Types.NOT_FOUND
          ? 404
          : err.type === MedusaError.Types.NOT_ALLOWED
            ? 503
            : 400
      logger.error(`[waitlist] signup failed for ${handle}: ${err.message}`)
      res.status(status).json({ message: err.message })
      return
    }
    logger.error(
      `[waitlist] signup failed for ${handle}: ${err instanceof Error ? err.message : String(err)}`
    )
    res.status(500).json({ message: "Waitlist signup failed" })
  }
}
