import { describe, expect, it } from "vitest"

import { buildOtpEmailContent } from "./send-otp-email"

describe("buildOtpEmailContent", () => {
  it("includes html so SendGrid can send the body", () => {
    const content = buildOtpEmailContent("login", "123456")
    expect(content.subject).toContain("inlogcode")
    expect(content.text).toContain("123456")
    expect(content.html).toContain("123456")
  })

  it("uses a set-password subject", () => {
    const content = buildOtpEmailContent("set_password", "000111")
    expect(content.subject).toContain("wachtwoord")
    expect(content.text).toContain("000111")
  })
})
