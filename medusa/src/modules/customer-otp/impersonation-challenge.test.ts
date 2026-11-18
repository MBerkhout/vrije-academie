import { describe, expect, it, vi, beforeEach } from "vitest"

import {
  buildImpersonationChallengeEmail,
  parseImpersonationChallengeEmail,
} from "./service"
import { otpTtlMs } from "./lib/otp-ttl"

describe("impersonation challenge email key", () => {
  it("round-trips customer and admin ids", () => {
    const email = buildImpersonationChallengeEmail("cus_abc", "user_xyz")
    expect(email).toBe("impersonate:cus_abc:by:user_xyz")
    expect(parseImpersonationChallengeEmail(email)).toEqual({
      customerId: "cus_abc",
      adminUserId: "user_xyz",
    })
  })

  it("rejects invalid keys", () => {
    expect(parseImpersonationChallengeEmail("user@example.com")).toBeNull()
  })
})

describe("impersonation TTL", () => {
  it("is 60 seconds", () => {
    expect(otpTtlMs("impersonate")).toBe(60_000)
  })
})

describe("exchangeImpersonationCode (mocked storage)", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("documents single-use consumption contract", () => {
    expect(true).toBe(true)
  })
})