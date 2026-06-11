import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import {
  assertValidEmail,
  getCustomerByEmail,
  type OtpPurpose,
} from "../../../../../lib/customer-auth/helpers"
import { CUSTOMER_OTP_MODULE } from "../../../../../modules/customer-otp"
import type CustomerOtpModuleService from "../../../../../modules/customer-otp/service"

/**
 * POST /store/auth/otp/request
 * Body: { email, purpose?: 'login' | 'set_password' }
 */
export async function POST(req: MedusaStoreRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as { email?: string; purpose?: OtpPurpose }
  const purpose: OtpPurpose = body.purpose === "set_password" ? "set_password" : "login"

  try {
    let email: string
    if (purpose === "set_password") {
      const actorId = req.auth_context?.actor_id
      if (!actorId) {
        throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Authentication required")
      }
      const customerService = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
      const customer = await customerService.retrieveCustomer(actorId, { select: ["email"] })
      if (!customer.email) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "Customer email not found")
      }
      email = assertValidEmail(customer.email)
    } else {
      email = assertValidEmail(body.email ?? "")
      const customer = await getCustomerByEmail(req.scope, email)
      if (!customer) {
        res.json({ sent: true })
        return
      }
    }

    const otp = req.scope.resolve(CUSTOMER_OTP_MODULE) as InstanceType<
      typeof CustomerOtpModuleService
    >
    await otp.createChallenge(req.scope, email, purpose)
    res.json({ sent: true })
  } catch (err) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_ALLOWED) {
      res.status(429).json({ message: err.message })
      return
    }
    if (err instanceof MedusaError) {
      res.status(400).json({ message: err.message })
      return
    }
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
      error: (msg: string) => void
    }
    logger.error(
      `[customer-otp] request failed: ${err instanceof Error ? err.message : String(err)}`
    )
    res.status(500).json({ message: "Could not send verification code" })
  }
}
