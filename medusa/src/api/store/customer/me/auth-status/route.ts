import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { customerHasPassword } from "../../../../../lib/customer-auth/helpers"

/**
 * GET /store/customer/me/auth-status
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context.actor_id
  const customerService = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const customer = await customerService.retrieveCustomer(customerId, { select: ["email"] })
  const email = customer.email
  if (!email) {
    res.json({ hasPassword: false })
    return
  }

  const hasPassword = await customerHasPassword(req.scope, email)
  res.json({ hasPassword })
}
