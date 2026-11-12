import { describe, expect, it } from "vitest"

import {
  addCalendarMonths,
  isAccessActive,
  vathuisAccessExpiresAt,
  vathuisAccessExpiresAtWithOverride,
} from "./vathuis-access-expiry"

describe("vathuis-access-expiry", () => {
  it("adds calendar months with day clamping", () => {
    const jan31 = new Date("2026-01-31T12:00:00.000Z")
    const result = addCalendarMonths(jan31, 1)
    expect(result.getUTCMonth()).toBe(1)
    expect(result.getUTCDate()).toBeLessThanOrEqual(28)
  })

  it("grants three months of access", () => {
    const start = new Date("2026-04-10T10:00:00.000Z")
    const expires = vathuisAccessExpiresAt(start)
    expect(expires.getUTCMonth()).toBe(6)
    expect(expires.getUTCDate()).toBe(10)
  })

  it("uses 3 months when valid-until is null", () => {
    const start = new Date("2026-04-10T10:00:00.000Z")
    const expires = vathuisAccessExpiresAtWithOverride(start, null)
    expect(expires.getTime()).toBe(vathuisAccessExpiresAt(start).getTime())
  })

  it("uses 3 months when valid-until is earlier", () => {
    const start = new Date("2026-04-10T10:00:00.000Z")
    const earlier = new Date("2026-05-01T00:00:00.000Z")
    const expires = vathuisAccessExpiresAtWithOverride(start, earlier)
    expect(expires.getTime()).toBe(vathuisAccessExpiresAt(start).getTime())
  })

  it("extends when valid-until is later than 3 months", () => {
    const start = new Date("2026-04-10T10:00:00.000Z")
    const later = new Date("2027-01-15T23:59:59.000Z")
    const expires = vathuisAccessExpiresAtWithOverride(start, later)
    expect(expires.getTime()).toBe(later.getTime())
  })

  it("detects active access", () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isAccessActive(future)).toBe(true)
    expect(isAccessActive(past)).toBe(false)
  })
})
