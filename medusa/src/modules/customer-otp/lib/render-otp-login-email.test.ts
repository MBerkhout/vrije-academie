import { describe, expect, it } from "vitest"

import {
  buildOtpLoginEmail,
  resolveOtpLoginLogoUrl,
} from "./render-otp-login-email"

describe("buildOtpLoginEmail", () => {
  it("substitutes placeholders and escapes HTML in the code", () => {
    const logoUrl = "https://example.test/branding/logo-email.png"
    const { html, text } = buildOtpLoginEmail({
      code: "123456",
      validityMinutes: 60,
      logoUrl,
    })

    expect(html).toContain(logoUrl)
    expect(html).toContain("123456")
    expect(html).toContain("60 minuten geldig")
    expect(html).toContain("Vul deze code in om in te loggen.")
    expect(text).toContain("123456")
    expect(text).toContain("60 minuten geldig")
  })

  it("escapes malicious code fragments in html", () => {
    const { html } = buildOtpLoginEmail({
      code: "<script>alert(1)</script>",
      validityMinutes: 60,
      logoUrl: "https://example.test/logo.png",
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })
})

describe("resolveOtpLoginLogoUrl", () => {
  it("uses STOREFRONT_PUBLIC_URL without trailing slash", () => {
    expect(
      resolveOtpLoginLogoUrl({
        STOREFRONT_PUBLIC_URL: "https://shop.example/",
      })
    ).toBe("https://shop.example/branding/logo-email.png")
  })

  it("falls back to production storefront URL", () => {
    expect(resolveOtpLoginLogoUrl({})).toBe(
      "https://v2.vrijeacademie.nl/branding/logo-email.png"
    )
  })
})
