import { MedusaService } from "@medusajs/framework/utils"

import {
  hasSalesforceJwtCredentials,
  hasSalesforceRefreshEnvCredentials,
  salesforceAuthMode,
} from "./client/auth-mode"
import { clearSalesforceTokenCache } from "./client/auth"
import {
  markSalesforceDbOAuthCached,
  OAUTH_SETTINGS_ID,
  registerSalesforceOAuthLoader,
} from "./client/oauth-credentials"
import { sfRequest } from "./client/rest"
import { SalesforceOAuthSettings } from "./models/salesforce-oauth-settings"
import { SalesforceSyncState } from "./models/salesforce-sync-state"

class SalesforceSyncModuleService extends MedusaService({
  SalesforceSyncState,
  SalesforceOAuthSettings,
}) {
  private oauthLoaderRegistered = false
  private oauthCacheBootstrapped = false

  /** Register DB refresh-token resolver for auth client (once). */
  private ensureOAuthLoaderRegistered(): void {
    if (this.oauthLoaderRegistered) return
    this.oauthLoaderRegistered = true
    registerSalesforceOAuthLoader(async () => {
      const [row] = await this.listSalesforceOAuthSettings({}, { take: 1 })
      return {
        refresh_token: row?.refresh_token ?? null,
        instance_url: row?.instance_url ?? null,
      }
    })
  }

  /** Load DB token presence into auth-mode cache (once per process). */
  private async bootstrapOAuthCache(): Promise<void> {
    this.ensureOAuthLoaderRegistered()
    if (this.oauthCacheBootstrapped) return
    this.oauthCacheBootstrapped = true
    const [row] = await this.listSalesforceOAuthSettings({}, { take: 1 })
    markSalesforceDbOAuthCached(!!row?.refresh_token)
  }

  private async fetchOAuthSettingsRow() {
    const [row] = await this.listSalesforceOAuthSettings({}, { take: 1 })
    return row ?? null
  }

  async getOAuthSettingsRow() {
    await this.bootstrapOAuthCache()
    return this.fetchOAuthSettingsRow()
  }

  async saveOAuthConnection(input: { refresh_token: string; instance_url?: string | null }) {
    await this.bootstrapOAuthCache()
    clearSalesforceTokenCache()
    const now = new Date()
    const existing = await this.fetchOAuthSettingsRow()
    const payload = {
      refresh_token: input.refresh_token,
      instance_url: input.instance_url?.replace(/\/$/, "") ?? null,
      connected_at: now,
    }

    if (existing) {
      await this.updateSalesforceOAuthSettings({ id: existing.id, ...payload })
    } else {
      await this.createSalesforceOAuthSettings({ id: OAUTH_SETTINGS_ID, ...payload })
    }

    markSalesforceDbOAuthCached(true)
    return this.fetchOAuthSettingsRow()
  }

  async clearOAuthConnection(): Promise<void> {
    await this.bootstrapOAuthCache()
    const existing = await this.fetchOAuthSettingsRow()
    if (existing) {
      await this.deleteSalesforceOAuthSettings(existing.id)
    }
    clearSalesforceTokenCache()
    markSalesforceDbOAuthCached(false)
  }

  /** Whether sync workflows/subscribers should run (JWT env, refresh env, or DB token). */
  async isIntegrationReady(): Promise<boolean> {
    if (hasSalesforceJwtCredentials()) return true
    if (hasSalesforceRefreshEnvCredentials()) return true
    await this.bootstrapOAuthCache()
    const row = await this.fetchOAuthSettingsRow()
    return !!(
      row?.refresh_token &&
      process.env.SALESFORCE_CLIENT_ID?.trim() &&
      process.env.SALESFORCE_CLIENT_SECRET?.trim()
    )
  }

  /**
   * Upsert by external id field (Salesforce REST PATCH .../SObject/ExtField/Value).
   */
  async upsertByExternalId(
    sobject: string,
    externalIdField: string,
    externalId: string,
    fields: Record<string, unknown>
  ): Promise<{ id: string }> {
    this.ensureOAuthLoaderRegistered()
    const path = `/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(externalIdField)}/${encodeURIComponent(externalId)}`
    const { data, status } = await sfRequest<Record<string, unknown> | unknown[]>(
      "PATCH",
      path,
      { body: fields }
    )

    if (typeof data === "object" && data !== null && "id" in data && typeof (data as { id: unknown }).id === "string") {
      return { id: (data as { id: string }).id }
    }

    const escaped = externalId.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
    const q = await this.query<{ Id: string }>(
      `SELECT Id FROM ${sobject} WHERE ${externalIdField} = '${escaped}' LIMIT 1`
    )
    const row = q.records[0]
    if (row?.Id) return { id: row.Id }

    if (status === 204) {
      const q2 = await this.query<{ Id: string }>(
        `SELECT Id FROM ${sobject} WHERE ${externalIdField} = '${escaped}' LIMIT 1`
      )
      const row2 = q2.records[0]
      if (row2?.Id) return { id: row2.Id }
    }

    throw new Error("Salesforce upsert: could not resolve Id from response")
  }

  async retrieve(sobject: string, id: string, fields: string[]): Promise<Record<string, unknown>> {
    this.ensureOAuthLoaderRegistered()
    const fieldList = fields.join(",")
    const path = `/sobjects/${encodeURIComponent(sobject)}/${encodeURIComponent(id)}?fields=${encodeURIComponent(fieldList)}`
    const { data } = await sfRequest<Record<string, unknown>>("GET", path)
    return data
  }

  async query<T = Record<string, unknown>>(soql: string): Promise<{ records: T[]; totalSize: number }> {
    this.ensureOAuthLoaderRegistered()
    const q = encodeURIComponent(soql)
    const { data } = await sfRequest<{ records: T[]; totalSize: number }>("GET", `/query?q=${q}`)
    return data
  }

  async getOAuthStatusSummary() {
    await this.bootstrapOAuthCache()
    const row = await this.fetchOAuthSettingsRow()
    const mode = salesforceAuthMode()
    const envRefresh = !!process.env.SALESFORCE_REFRESH_TOKEN?.trim()
    const dbConnected = !!row?.refresh_token
    return {
      authMode: mode,
      jwtConfigured: hasSalesforceJwtCredentials(),
      canConnectOAuth: !hasSalesforceJwtCredentials() && !!(process.env.SALESFORCE_CLIENT_ID?.trim() && process.env.SALESFORCE_CLIENT_SECRET?.trim()),
      connected: mode === "jwt" || envRefresh || dbConnected,
      refreshTokenSource: envRefresh ? "env" : dbConnected ? "database" : null,
      instanceUrl:
        process.env.SALESFORCE_INSTANCE_URL?.trim() ||
        row?.instance_url ||
        null,
      connectedAt: row?.connected_at ?? null,
    }
  }

  /**
   * Find sync state by Medusa entity.
   */
  async getStateByMedusaId(entityType: string, medusaId: string) {
    const [row] = await this.listSalesforceSyncStates({
      entity_type: entityType,
      medusa_id: medusaId,
    })
    return row ?? null
  }

  async getStateBySalesforceId(entityType: string, salesforceId: string) {
    const [row] = await this.listSalesforceSyncStates({
      entity_type: entityType,
      salesforce_id: salesforceId,
    })
    return row ?? null
  }
  async listStatesBySalesforceId(salesforceId: string) {
    return await this.listSalesforceSyncStates({
      salesforce_id: salesforceId,
    })
  }
}

export default SalesforceSyncModuleService
