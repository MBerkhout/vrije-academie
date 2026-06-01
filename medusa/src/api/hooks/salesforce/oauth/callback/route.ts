import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"
import {
  consumeOAuthState,
  exchangeSalesforceAuthorizationCode,
  salesforceAdminReturnUrl,
} from "../../../../../modules/salesforce-sync/client/oauth-flow"

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;padding:2rem;max-width:40rem">${body}</body></html>`
}

/** GET /hooks/salesforce/oauth/callback — public OAuth redirect (state + PKCE; not under /admin). */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : null
  const state = typeof req.query.state === "string" ? req.query.state : null
  const sfError = typeof req.query.error === "string" ? req.query.error : null
  const sfErrorDesc =
    typeof req.query.error_description === "string" ? req.query.error_description : null

  if (sfError) {
    const msg = sfErrorDesc || sfError
    res.status(400).send(
      htmlPage(
        "Salesforce connection failed",
        `<h1>Connection failed</h1><p>${msg}</p><p><a href="${salesforceAdminReturnUrl("oauth=error")}">Back to Salesforce sync</a></p>`
      )
    )
    return
  }

  if (!code || !state) {
    res.status(400).send(
      htmlPage(
        "Invalid callback",
        `<h1>Missing code or state</h1><p><a href="${salesforceAdminReturnUrl()}">Back to Salesforce sync</a></p>`
      )
    )
    return
  }

  const consumed = consumeOAuthState(state)
  if (!consumed) {
    res.status(400).send(
      htmlPage(
        "Invalid or expired state",
        `<h1>OAuth state expired</h1><p>Start connection again from the Salesforce sync page.</p><p><a href="${salesforceAdminReturnUrl("oauth=expired")}">Back to Salesforce sync</a></p>`
      )
    )
    return
  }

  try {
    const tokens = await exchangeSalesforceAuthorizationCode(code, consumed.codeVerifier)
    if (!tokens.refresh_token) {
      throw new Error(
        "Salesforce did not return a refresh_token. Ensure the Connected App includes refresh_token / offline_access scope."
      )
    }

    const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
    await sync.saveOAuthConnection({
      refresh_token: tokens.refresh_token,
      instance_url: tokens.instance_url ?? null,
    })

    res.redirect(302, salesforceAdminReturnUrl("oauth=success"))
  } catch (err) {
    const msg = (err as Error).message
    res.status(500).send(
      htmlPage(
        "Salesforce connection failed",
        `<h1>Token exchange failed</h1><p>${msg}</p><p><a href="${salesforceAdminReturnUrl("oauth=error")}">Back to Salesforce sync</a></p>`
      )
    )
  }
}
