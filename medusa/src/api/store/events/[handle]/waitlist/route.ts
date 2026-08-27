import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"
import {
  joinEventWaitlistWorkflowId,
} from "../../../../../workflows/salesforce/join-event-waitlist"

/**
 * POST /store/events/:handle/waitlist
 * Body: { quantity, first_name, last_name, email, phone }
 */
export async function POST(req: MedusaStoreRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle as string
  const body = (req.body ?? {}) as {
    quantity?: number
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
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

    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as {
      run: (id: string, opts: Record<string, unknown>) => Promise<{ result: unknown }>
    }

    const { result } = await workflowEngine.run(joinEventWaitlistWorkflowId, {
      input: {
        handle,
        quantity: Number(body.quantity),
        first_name: body.first_name ?? "",
        last_name: body.last_name ?? "",
        email: body.email ?? "",
        phone: body.phone ?? "",
        authenticatedCustomerId: req.auth_context?.actor_id ?? null,
      },
      throwOnError: true,
    })

    const registration = result as { skipped?: boolean; salesforceRegistrationId?: string | null }
    if (registration?.skipped || !registration?.salesforceRegistrationId) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Waitlist signup could not be completed")
    }

    res.json({ success: true })
  } catch (err) {
    if (err instanceof MedusaError) {
      const status =
        err.type === MedusaError.Types.NOT_FOUND
          ? 404
          : err.type === MedusaError.Types.NOT_ALLOWED
            ? 503
            : 400
      res.status(status).json({ message: err.message })
      return
    }
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error: (msg: string) => void
    }
    logger.error(
      `[waitlist] signup failed for ${handle}: ${err instanceof Error ? err.message : String(err)}`
    )
    res.status(500).json({ message: "Waitlist signup failed" })
  }
}
