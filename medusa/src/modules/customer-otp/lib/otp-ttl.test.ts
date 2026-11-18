import { describe, expect, it } from "vitest"

import {
  OTP_IMPERSONATE_TTL_MS,
  OTP_LOGIN_TTL_MS,
  OTP_SET_PASSWORD_TTL_MS,
  otpTtlMs,
} from "./otp-ttl"

describe("otpTtlMs", () => {
  it("uses 60s for impersonate", () => {
    expect(otpTtlMs("impersonate")).toBe(OTP_IMPERSONATE_TTL_MS)
    expect(OTP_IMPERSONATE_TTL_MS).toBe(60_000)
  })

  it("keeps existing TTLs", () => {
    expect(otpTtlMs("login")).toBe(OTP_LOGIN_TTL_MS)
    expect(otpTtlMs("set_password")).toBe(OTP_SET_PASSWORD_TTL_MS)
  })
})