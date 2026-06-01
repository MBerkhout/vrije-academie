import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"
import {
  maskClientId,
  salesforceOAuthCallbackUrl,
} from "../../../../../modules/salesforce-sync/client/oauth-flow"

/** GET /admin/salesforce/oauth/status */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const summary = await sync.getOAuthStatusSummary()
  const clientId = process.env.SALESFORCE_CLIENT_ID?.trim() ?? ""

  let callbackUrl: string | null = null
  try {
    callbackUrl = salesforceOAuthCallbackUrl()
  } catch {
    callbackUrl = null
  }

  res.json({
    ...summary,
    clientIdPreview: clientId ? maskClientId(clientId) : null,
    callbackUrl,
    loginUrl: process.env.SALESFORCE_LOGIN_URL?.trim() || "https://login.salesforce.com",
  })
}
