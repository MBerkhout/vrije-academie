import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { enqueueCustomerPullFromSalesforce } from "../../../../../modules/salesforce-sync/utils/enqueue-customer-pull"

/** POST /store/customer/me/sync-from-salesforce — refresh profile from Salesforce after login. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context.actor_id
  const customerService = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const customer = await customerService.retrieveCustomer(customerId, { select: ["email"] })
  const email = customer.email?.trim()

  if (!email) {
    res.status(400).json({ message: "Customer email is required" })
    return
  }

  await enqueueCustomerPullFromSalesforce(req.scope, customerId, email)
  res.status(202).json({ queued: true })
}
