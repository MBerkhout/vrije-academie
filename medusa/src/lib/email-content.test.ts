import { describe, expect, it } from "vitest"

import { emailContent, escapeHtml, hasEmailProvider, textToHtml } from "./email-content"

describe("emailContent", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`a <b> & "c"`)).toBe("a &lt;b&gt; &amp; &quot;c&quot;")
  })

  it("wraps and escapes plain text as html", () => {
    const html = textToHtml("Code: 12<34")
    expect(html).toContain("Code: 12&lt;34")
    expect(html).toContain("white-space:pre-wrap")
  })

  it("fills html from text when omitted", () => {
    const content = emailContent({ subject: "OTP", text: "Je code is 123456" })
    expect(content.html).toContain("Je code is 123456")
    expect(content.text).toBe("Je code is 123456")
  })

  it("keeps an explicit html body", () => {
    const content = emailContent({
      subject: "OTP",
      text: "plain",
      html: "<p>rich</p>",
    })
    expect(content.html).toBe("<p>rich</p>")
  })
})

describe("hasEmailProvider", () => {
  it("is false without SMTP or SendGrid", () => {
    expect(hasEmailProvider({})).toBe(false)
  })

  it("is true when SMTP_HOST is set", () => {
    expect(hasEmailProvider({ SMTP_HOST: "127.0.0.1" })).toBe(true)
  })

  it("is true when SENDGRID_API_KEY is set", () => {
    expect(hasEmailProvider({ SENDGRID_API_KEY: "SG.x" })).toBe(true)
  })
})
