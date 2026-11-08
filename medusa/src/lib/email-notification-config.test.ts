import { describe, expect, it } from "vitest"

import { resolveEmailNotificationConfig } from "./email-notification-config"

describe("resolveEmailNotificationConfig", () => {
  it("returns none when no mail env is set", () => {
    expect(resolveEmailNotificationConfig({})).toEqual({ kind: "none" })
  })

  it("prefers Resend over SMTP and SendGrid", () => {
    const config = resolveEmailNotificationConfig({
      RESEND_API_KEY: "re_123",
      RESEND_FROM: "Vrije Academie <info@vrijeacademie.nl>",
      SMTP_HOST: "127.0.0.1",
      SENDGRID_API_KEY: "SG.ignored",
    })
    expect(config).toEqual({
      kind: "resend",
      options: {
        channels: ["email"],
        api_key: "re_123",
        from: "Vrije Academie <info@vrijeacademie.nl>",
      },
    })
  })

  it("prefers SMTP over SendGrid when Resend is unset", () => {
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
      ignoreTLS: true,
      from: "info@vrijeacademie.nl",
    })
    expect(config.options.auth).toBeUndefined()
  })

  it("uses Resend with default from when RESEND_FROM is unset", () => {
    const config = resolveEmailNotificationConfig({
      RESEND_API_KEY: "re_abc",
    })
    expect(config).toEqual({
      kind: "resend",
      options: {
        channels: ["email"],
        api_key: "re_abc",
        from: "info@vrijeacademie.nl",
      },
    })
  })

  it("uses SendGrid when Resend and SMTP are unset", () => {
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
    expect(config.options.ignoreTLS).toBe(false)
  })

  it("skips STARTTLS for loopback hosts", () => {
    const local = resolveEmailNotificationConfig({ SMTP_HOST: "localhost" })
    const ipv6 = resolveEmailNotificationConfig({ SMTP_HOST: "::1" })
    expect(local.kind === "smtp" && local.options.ignoreTLS).toBe(true)
    expect(ipv6.kind === "smtp" && ipv6.options.ignoreTLS).toBe(true)
  })

  it("lets SMTP_IGNORE_TLS override the loopback default", () => {
    const forcedOff = resolveEmailNotificationConfig({
      SMTP_HOST: "127.0.0.1",
      SMTP_IGNORE_TLS: "false",
    })
    expect(forcedOff.kind === "smtp" && forcedOff.options.ignoreTLS).toBe(false)

    const forcedOn = resolveEmailNotificationConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_IGNORE_TLS: "true",
    })
    expect(forcedOn.kind === "smtp" && forcedOn.options.ignoreTLS).toBe(true)
  })
})
