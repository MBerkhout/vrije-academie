import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { enqueueCustomerPullFromSalesforce } from "../../../../../modules/salesforce-sync/utils/enqueue-customer-pull"
import { pullFavouritesFromSalesforce } from "../../../../../modules/salesforce-sync/utils/pull-favourites-from-salesforce"
import { resolveCustomerSalesforceIds } from "../../../../../modules/salesforce-sync/utils/resolve-customer-salesforce-ids"

/** POST /store/customer/me/sync-from-salesforce — refresh profile + favourites from Salesforce after login. */
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

  const sfIds = await resolveCustomerSalesforceIds(req.scope, customerId, email)
  let favouritesMerged: string[] | undefined
  if (sfIds?.contactId) {
    const pulled = await pullFavouritesFromSalesforce(
      req.scope,
      customerId,
      sfIds.contactId,
      sfIds.accountId
    )
    favouritesMerged = pulled.mergedHandles
  }

  await enqueueCustomerPullFromSalesforce(req.scope, customerId, email)
  res.status(202).json({
    queued: true,
    ...(favouritesMerged ? { favourites_handles: favouritesMerged } : {}),
  })
}
