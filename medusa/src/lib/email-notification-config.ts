const DEFAULT_FROM = "noreply@vrijeacademie.nl"

export type SmtpNotificationOptions = {
  channels: ["email"]
  from: string
  host: string
  port: number
  secure: boolean
  auth?: { user: string; pass: string }
}

export type SendgridNotificationOptions = {
  channels: ["email"]
  api_key: string
  from: string
}

export type EmailNotificationConfig =
  | { kind: "none" }
  | { kind: "smtp"; options: SmtpNotificationOptions }
  | { kind: "sendgrid"; options: SendgridNotificationOptions }

function parsePort(raw: string | undefined): number {
  const port = Number.parseInt(raw ?? "587", 10)
  return Number.isFinite(port) && port > 0 ? port : 587
}

function parseSecure(env: Record<string, string | undefined>, port: number): boolean {
  if (env.SMTP_SECURE === "true" || env.SMTP_SECURE === "1") return true
  if (env.SMTP_SECURE === "false" || env.SMTP_SECURE === "0") return false
  return port === 465
}

/** SMTP takes precedence over SendGrid when both are set. */
export function resolveEmailNotificationConfig(
  env: Record<string, string | undefined> = process.env
): EmailNotificationConfig {
  const from =
    env.SMTP_FROM?.trim() || env.SENDGRID_FROM?.trim() || DEFAULT_FROM

  const host = env.SMTP_HOST?.trim()
  if (host) {
    const port = parsePort(env.SMTP_PORT)
    const user = env.SMTP_USER?.trim()
    return {
      kind: "smtp",
      options: {
        channels: ["email"],
        from,
        host,
        port,
        secure: parseSecure(env, port),
        ...(user ? { auth: { user, pass: env.SMTP_PASS ?? "" } } : {}),
      },
    }
  }

  const apiKey = env.SENDGRID_API_KEY?.trim()
  if (apiKey) {
    return {
      kind: "sendgrid",
      options: {
        channels: ["email"],
        api_key: apiKey,
        from,
      },
    }
  }

  return { kind: "none" }
}

export function emailNotificationModule(
  env: Record<string, string | undefined> = process.env
): Record<string, unknown> {
  const config = resolveEmailNotificationConfig(env)
  if (config.kind === "smtp") {
    return {
      notification: {
        resolve: "@medusajs/medusa/notification",
        options: {
          providers: [
            {
              resolve: "./src/providers/smtp",
              id: "smtp",
              options: config.options,
            },
          ],
        },
      },
    }
  }
  if (config.kind === "sendgrid") {
    return {
      notification: {
        resolve: "@medusajs/medusa/notification",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/notification-sendgrid",
              id: "sendgrid",
              options: config.options,
            },
          ],
        },
      },
    }
  }
  return {}
}
