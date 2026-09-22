import { describe, expect, it } from "vitest"

import { buildSmtpMail } from "./build-mail"

describe("buildSmtpMail", () => {
  it("fills html from text for SendGrid-compatible bodies", () => {
    const mail = buildSmtpMail(
      {
        to: "user@example.com",
        content: { subject: "Je inlogcode", text: "Code: 123456" },
      },
      "noreply@vrijeacademie.nl"
    )
    expect(mail.from).toBe("noreply@vrijeacademie.nl")
    expect(mail.subject).toBe("Je inlogcode")
    expect(mail.text).toBe("Code: 123456")
    expect(mail.html).toContain("Code: 123456")
  })

  it("prefers notification.from over the default", () => {
    const mail = buildSmtpMail(
      {
        to: "user@example.com",
        from: "cadeaubon@vrijeacademie.nl",
        content: { subject: "Cadeaubon", html: "<p>Hi</p>" },
      },
      "noreply@vrijeacademie.nl"
    )
    expect(mail.from).toBe("cadeaubon@vrijeacademie.nl")
    expect(mail.html).toBe("<p>Hi</p>")
  })

  it("rejects mail without a body", () => {
    expect(() =>
      buildSmtpMail(
        { to: "user@example.com", content: { subject: "Empty" } },
        "noreply@vrijeacademie.nl"
      )
    ).toThrow(/text or html/)
  })
})
