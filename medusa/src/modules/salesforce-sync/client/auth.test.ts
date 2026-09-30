import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TokenStoreRedis } from "./token-store"

type Db = { refresh_token: string }

function fakeRedis(): TokenStoreRedis {
  const store = new Map<string, string>()
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => {
      store.set(key, value)
      return "OK"
    },
    del: async (key) => store.delete(key),
  }
}

/** Salesforce token endpoint with enforced refresh-token rotation. */
function stubTokenEndpoint(db: Db) {
  let n = 0
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    const presented = new URLSearchParams(init.body).get("refresh_token")
    if (presented !== db.refresh_token) {
      return new Response(
        JSON.stringify({ error: "invalid_grant", error_description: "expired access/refresh token" }),
        { status: 400 }
      )
    }
    n++
    return new Response(
      JSON.stringify({
        access_token: `at-${n}`,
        refresh_token: `rt-${n}`,
        instance_url: "https://example.my.salesforce.com",
      }),
      { status: 200 }
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Fresh module state = a (re)started PM2 process sharing Redis and the database. */
async function startProcess(redis: TokenStoreRedis, db: Db) {
  vi.resetModules()
  const store = await import("./token-store.js")
  store.setTokenStoreRedisForTests(redis)
  const creds = await import("./oauth-credentials.js")
  creds.registerSalesforceOAuthLoader(async () => ({
    refresh_token: db.refresh_token,
    instance_url: null,
  }))
  creds.registerSalesforceRefreshTokenSaver(async (token: string) => {
    db.refresh_token = token
  })
  return import("./auth.js")
}

describe("Salesforce refresh-token auth with a shared access token", () => {
  beforeEach(() => {
    process.env.SALESFORCE_AUTH_MODE = "refresh_token"
    process.env.SALESFORCE_CLIENT_ID = "client"
    process.env.SALESFORCE_CLIENT_SECRET = "secret"
    delete process.env.REDIS_URL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.SALESFORCE_AUTH_MODE
    delete process.env.SALESFORCE_CLIENT_ID
    delete process.env.SALESFORCE_CLIENT_SECRET
  })

  it("does not rotate the refresh token again when a process restarts", async () => {
    const db = { refresh_token: "rt-0" }
    const redis = fakeRedis()
    const fetchMock = stubTokenEndpoint(db)

    const first = await startProcess(redis, db)
    await expect(first.getSalesforceAccessToken()).resolves.toMatchObject({ access_token: "at-1" })
    expect(db.refresh_token).toBe("rt-1")

    const restarted = await startProcess(redis, db)
    await expect(restarted.getSalesforceAccessToken()).resolves.toMatchObject({ access_token: "at-1" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(db.refresh_token).toBe("rt-1")
  })

  it("refreshes with the latest refresh token after a 401 invalidates the shared token", async () => {
    const db = { refresh_token: "rt-0" }
    const redis = fakeRedis()
    const fetchMock = stubTokenEndpoint(db)

    const auth = await startProcess(redis, db)
    await auth.getSalesforceAccessToken()
    await auth.invalidateSalesforceAccessToken("at-1")

    await expect(auth.getSalesforceAccessToken()).resolves.toMatchObject({ access_token: "at-2" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(db.refresh_token).toBe("rt-2")
  })

  it("keeps a newer shared token when another process reports its stale one", async () => {
    const db = { refresh_token: "rt-0" }
    const redis = fakeRedis()
    const fetchMock = stubTokenEndpoint(db)

    const a = await startProcess(redis, db)
    await a.getSalesforceAccessToken()
    const b = await startProcess(redis, db)
    await b.invalidateSalesforceAccessToken("at-1")
    await expect(b.getSalesforceAccessToken()).resolves.toMatchObject({ access_token: "at-2" })

    await b.invalidateSalesforceAccessToken("at-1")
    const c = await startProcess(redis, db)
    await expect(c.getSalesforceAccessToken()).resolves.toMatchObject({ access_token: "at-2" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
