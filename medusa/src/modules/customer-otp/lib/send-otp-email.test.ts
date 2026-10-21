import { describe, expect, it } from "vitest"

import { buildOtpEmailContent } from "./send-otp-email"

describe("buildOtpEmailContent", () => {
  it("uses branded html for login otp", () => {
    const content = buildOtpEmailContent("login", "123456")
    expect(content.subject).toBe("Je inlogcode voor Mijn Vrije Academie")
    expect(content.text).toContain("123456")
    expect(content.text).toContain("60 minuten geldig")
    expect(content.text).not.toContain("1 uur geldig")
    expect(content.html).toContain("123456")
    expect(content.html).toContain("Vul deze code in om in te loggen.")
    expect(content.html).toContain("/branding/logo-email.png")
  })

  it("uses a set-password subject", () => {
    const content = buildOtpEmailContent("set_password", "000111")
    expect(content.subject).toContain("wachtwoord")
    expect(content.text).toContain("000111")
    expect(content.text).toContain("10 minuten geldig")
  })
})
