import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("sendSgtmEvent", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.SGTM_ENDPOINT_URL = "https://sgtm.example/collect"
    process.env.SGTM_PURCHASE_SECRET = "secret"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => "" }))
    )
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it("posts Stape-shaped JSON with bearer auth", async () => {
    const { sendSgtmEvent } = await import("./send-sgtm-event.js")
    await sendSgtmEvent({ event: "purchase", transaction_id: "VA-9", value: 1 })

    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("https://sgtm.example/collect")
    expect(url).toContain("event_name=purchase")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret")
    const body = JSON.parse(String(init.body))
    expect(body.event_name).toBe("purchase")
    expect(body.transaction_id).toBe("VA-9")
  })
})
