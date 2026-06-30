import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { enqueueCustomerPushToSalesforce } from "../../../../../modules/salesforce-sync/utils/enqueue-customer-push"

/** POST /store/customer/me/push-to-salesforce — push profile + default address to Salesforce. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context.actor_id
  await enqueueCustomerPushToSalesforce(req.scope, customerId, { isCreate: true })
  res.status(202).json({ queued: true })
}
