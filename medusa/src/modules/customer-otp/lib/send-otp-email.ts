import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export type OtpPurpose = "login" | "set_password"

const PURPOSE_SUBJECT: Record<OtpPurpose, string> = {
  login: "Je eenmalige inlogcode — Vrije Academie",
  set_password: "Bevestig je wachtwoord — Vrije Academie",
}

function purposeBody(purpose: OtpPurpose, code: string): string {
  if (purpose === "set_password") {
    return [
      "Je hebt gevraagd om een wachtwoord in te stellen voor je Vrije Academie-account.",
      "",
      `Je verificatiecode is: ${code}`,
      "",
      "Deze code is 10 minuten geldig.",
      "",
      "Heb je dit niet aangevraagd? Negeer deze e-mail.",
    ].join("\n")
  }
  return [
    "Gebruik onderstaande code om in te loggen bij Vrije Academie.",
    "",
    `Je inlogcode is: ${code}`,
    "",
    "Deze code is 10 minuten geldig.",
    "",
    "Heb je dit niet aangevraagd? Negeer deze e-mail.",
  ].join("\n")
}

function hasConfiguredEmailProvider(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY?.trim())
}

function logOtpToConsole(
  logger: { info: (msg: string) => void; warn: (msg: string) => void },
  input: { email: string; code: string; purpose: OtpPurpose }
): void {
  const subject = PURPOSE_SUBJECT[input.purpose]
  const text = purposeBody(input.purpose, input.code)
  // warn — visible in medusa dev output alongside http: lines
  logger.warn(`[customer-otp] ${input.email} → ${input.code}`)
  logger.info(`[customer-otp] ${subject}\n${text}`)
}

export async function sendOtpEmail(
  container: { resolve: (key: string) => unknown },
  input: { email: string; code: string; purpose: OtpPurpose }
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
  }

  const subject = PURPOSE_SUBJECT[input.purpose]
  const text = purposeBody(input.purpose, input.code)

  if (!hasConfiguredEmailProvider()) {
    logOtpToConsole(logger, input)
    return
  }

  try {
    const notification = container.resolve(Modules.NOTIFICATION) as {
      createNotifications: (data: Record<string, unknown>) => Promise<unknown>
    }
    await notification.createNotifications({
      to: input.email,
      channel: "email",
      template: "customer-otp",
      data: {
        code: input.code,
        purpose: input.purpose,
      },
      content: { subject, text },
      trigger_type: "customer-otp",
      resource_type: "customer",
      idempotency_key: `customer-otp-${input.email}-${Date.now()}`,
    })
    if (process.env.NODE_ENV !== "production") {
      logOtpToConsole(logger, input)
    }
  } catch (err) {
    logger.error(
      `[customer-otp] email send failed: ${err instanceof Error ? err.message : String(err)}`
    )
    logOtpToConsole(logger, input)
  }
}
