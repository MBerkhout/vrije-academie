import { describe, expect, it } from "vitest"

import { resolveEmailNotificationConfig } from "./email-notification-config"

describe("resolveEmailNotificationConfig", () => {
  it("returns none when no mail env is set", () => {
    expect(resolveEmailNotificationConfig({})).toEqual({ kind: "none" })
  })

  it("prefers SMTP over SendGrid", () => {
    const config = resolveEmailNotificationConfig({
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "25",
      SENDGRID_API_KEY: "SG.ignored",
    })
    expect(config.kind).toBe("smtp")
    if (config.kind !== "smtp") return
    expect(config.options).toMatchObject({
      host: "127.0.0.1",
      port: 25,
      secure: false,
      from: "noreply@vrijeacademie.nl",
    })
    expect(config.options.auth).toBeUndefined()
  })

  it("uses SendGrid when SMTP is unset", () => {
    const config = resolveEmailNotificationConfig({
      SENDGRID_API_KEY: "SG.key",
      SENDGRID_FROM: "hello@example.com",
    })
    expect(config).toEqual({
      kind: "sendgrid",
      options: {
        channels: ["email"],
        api_key: "SG.key",
        from: "hello@example.com",
      },
    })
  })

  it("enables TLS for port 465 unless SMTP_SECURE=false", () => {
    const implicit = resolveEmailNotificationConfig({
      SMTP_HOST: "mail.example.com",
      SMTP_PORT: "465",
    })
    expect(implicit.kind === "smtp" && implicit.options.secure).toBe(true)

    const forcedOff = resolveEmailNotificationConfig({
      SMTP_HOST: "mail.example.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "false",
    })
    expect(forcedOff.kind === "smtp" && forcedOff.options.secure).toBe(false)
  })

  it("passes SMTP auth when a user is set", () => {
    const config = resolveEmailNotificationConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "va",
      SMTP_PASS: "secret",
      SMTP_FROM: "noreply@vrijeacademie.nl",
    })
    expect(config.kind).toBe("smtp")
    if (config.kind !== "smtp") return
    expect(config.options.auth).toEqual({ user: "va", pass: "secret" })
    expect(config.options.port).toBe(587)
  })
})
