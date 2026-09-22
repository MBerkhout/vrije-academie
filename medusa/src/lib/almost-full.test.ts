import { describe, expect, it } from "vitest"

import { isAlmostFullAvailability } from "./almost-full"

describe("isAlmostFullAvailability", () => {
  it("is false when sold out", () => {
    expect(isAlmostFullAvailability({ available_quantity: 0, capacity: 15 })).toBe(false)
  })

  it("uses 30% of capacity rounded up (15 seats → bijna vol at 5 remaining / 10 occupied)", () => {
    expect(isAlmostFullAvailability({ available_quantity: 5, capacity: 15 })).toBe(true)
    expect(isAlmostFullAvailability({ available_quantity: 6, capacity: 15 })).toBe(false)
  })

  it("falls back to ≤ 3 remaining when capacity is unknown", () => {
    expect(isAlmostFullAvailability({ available_quantity: 3, capacity: 0 })).toBe(true)
    expect(isAlmostFullAvailability({ available_quantity: 4, capacity: 0 })).toBe(false)
  })
})
