import { describe, expect, it } from "vitest"

import { getGa4Config, lastDates } from "./config"
import { mapReportsToRows } from "./map-reports"

describe("mapReportsToRows", () => {
  const date = "2026-11-26"
  it("merges reports per handle and computes avg position", () => {
    const { daily, listClicks } = mapReportsToRows(
      date,
      [{ itemId: "a", views: 10, users: 6 }],
      [{ itemId: "a", addToCart: 2 }, { itemId: "b", addToCart: 1 }],
      [
        { itemId: "a", listId: "plp", position: 1, clicks: 3 },
        { itemId: "a", listId: "plp", position: 3, clicks: 1 },
      ]
    )
    const a = daily.find((r) => r.product_handle === "a")!
    expect(a).toMatchObject({ views: 10, unique_users: 6, add_to_cart: 2, list_clicks: 4, avg_list_position: 1.5 })
    expect(daily.find((r) => r.product_handle === "b")!.add_to_cart).toBe(1)
    expect(listClicks).toHaveLength(2)
  })
  it("drops (not set) and unknown handles", () => {
    const { daily } = mapReportsToRows(
      date,
      [{ itemId: "(not set)", views: 5, users: 5 }, { itemId: "x", views: 1, users: 1 }, { itemId: "a", views: 1, users: 1 }],
      [], [], new Set(["a"])
    )
    expect(daily.map((r) => r.product_handle)).toEqual(["a"])
  })
})

describe("config", () => {
  it("is disabled unless GA4_ENABLED=true with a property", () => {
    expect(getGa4Config({} as NodeJS.ProcessEnv)).toBeNull()
    expect(getGa4Config({ GA4_ENABLED: "true" } as NodeJS.ProcessEnv)).toBeNull()
    expect(
      getGa4Config({ GA4_ENABLED: "true", GA4_PROPERTY_ID: "1", GA4_SERVICE_ACCOUNT_JSON: '{"client_email":"a","private_key":"k"}' } as NodeJS.ProcessEnv)
    ).toMatchObject({ propertyId: "1" })
  })
  it("lists yesterday first", () => {
    expect(lastDates(2, new Date("2026-11-27T10:00:00Z"))).toEqual(["2026-11-26", "2026-11-25"])
  })
})
