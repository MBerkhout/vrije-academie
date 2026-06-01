import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"
import {
  createOAuthAuthorization,
  salesforceOAuthCallbackUrl,
} from "../../../../../modules/salesforce-sync/client/oauth-flow"

/** POST /admin/salesforce/oauth/start */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const summary = await sync.getOAuthStatusSummary()

  if (summary.jwtConfigured) {
    res.status(400).json({ message: "JWT auth is configured; OAuth connect is not used." })
    return
  }
  if (!summary.canConnectOAuth) {
    res.status(400).json({
      message: "Set SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, and MEDUSA_URL in env first.",
    })
    return
  }

  const { authorizeUrl } = createOAuthAuthorization()

  res.json({ authorizeUrl, callbackUrl: salesforceOAuthCallbackUrl() })
}
