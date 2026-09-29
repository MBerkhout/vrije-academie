import { afterEach, describe, expect, it, vi } from "vitest"

import {
  registerSalesforceOAuthLoader,
  resolveStoredOAuthCredentials,
} from "./oauth-credentials"

describe("resolveStoredOAuthCredentials", () => {
  afterEach(() => {
    registerSalesforceOAuthLoader(async () => ({
      refresh_token: null,
      instance_url: null,
    }))
    delete process.env.SALESFORCE_REFRESH_TOKEN
    delete process.env.SALESFORCE_INSTANCE_URL
  })

  it("prefers the database refresh token over env", async () => {
    process.env.SALESFORCE_REFRESH_TOKEN = "env-stale"
    process.env.SALESFORCE_INSTANCE_URL = "https://env.example.com"
    registerSalesforceOAuthLoader(async () => ({
      refresh_token: "db-current",
      instance_url: "https://db.example.com",
    }))

    await expect(resolveStoredOAuthCredentials()).resolves.toEqual({
      refresh_token: "db-current",
      instance_url: "https://db.example.com",
    })
  })

  it("falls back to env when the database has no token", async () => {
    process.env.SALESFORCE_REFRESH_TOKEN = "env-only"
    registerSalesforceOAuthLoader(async () => ({
      refresh_token: null,
      instance_url: null,
    }))

    await expect(resolveStoredOAuthCredentials()).resolves.toEqual({
      refresh_token: "env-only",
      instance_url: null,
    })
  })
})
