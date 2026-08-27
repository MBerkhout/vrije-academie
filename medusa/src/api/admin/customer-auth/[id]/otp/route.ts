import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { getCustomerById } from "../../../../../lib/customer-auth/helpers"
import { CUSTOMER_OTP_MODULE } from "../../../../../modules/customer-otp"
import type CustomerOtpModuleService from "../../../../../modules/customer-otp/service"

/**
 * POST /admin/customer-auth/:id/otp
 *
 * Generate a login OTP for support. Returns plaintext code (not emailed).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  if (!id?.trim()) {
    res.status(400).json({ message: "id is required" })
    return
  }

  try {
    const customer = await getCustomerById(req.scope, id)
    if (!customer.email) {
      res.status(400).json({ message: "Customer email not found" })
      return
    }

    const otp = req.scope.resolve(CUSTOMER_OTP_MODULE) as InstanceType<
      typeof CustomerOtpModuleService
    >
    const result = await otp.createAdminChallenge(customer.email, "login")
    res.json(result)
  } catch (err) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND) {
      res.status(404).json({ message: "Customer not found" })
      return
    }
    throw err
  }
}
