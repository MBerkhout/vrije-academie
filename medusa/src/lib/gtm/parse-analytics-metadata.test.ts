import { describe, expect, it } from "vitest"

import { parseOrderAnalyticsMetadata } from "./parse-analytics-metadata"

describe("parseOrderAnalyticsMetadata", () => {
  it("returns empty object when analytics is missing", () => {
    expect(parseOrderAnalyticsMetadata({})).toEqual({})
  })

  it("maps storefront attribution fields", () => {
    expect(
      parseOrderAnalyticsMetadata({
        analytics: {
          event_id: "abc",
          client_id: "1.2",
          fbp: "fb.1",
          payment_type: "iDEAL",
        },
      })
    ).toMatchObject({
      event_id: "abc",
      client_id: "1.2",
      fbp: "fb.1",
      payment_type: "iDEAL",
    })
  })
})
