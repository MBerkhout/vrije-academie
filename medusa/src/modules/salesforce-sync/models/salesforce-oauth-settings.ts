import { model } from "@medusajs/framework/utils"

/** Singleton OAuth credentials (refresh token from admin connect flow). */
export const SalesforceOAuthSettings = model.define("salesforce_oauth_settings", {
  id: model.id().primaryKey(),
  refresh_token: model.text().nullable(),
  instance_url: model.text().nullable(),
  connected_at: model.dateTime().nullable(),
})
