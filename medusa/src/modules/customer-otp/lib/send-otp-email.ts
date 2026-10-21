import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { emailContent, hasEmailProvider } from "../../../lib/email-content"
import { otpValidityMinutes, type OtpPurpose } from "./otp-ttl"
import {
  buildOtpLoginEmail,
  resolveOtpLoginLogoUrl,
} from "./render-otp-login-email"

export type { OtpPurpose }

const PURPOSE_SUBJECT: Record<OtpPurpose, string> = {
  login: "Je inlogcode voor Mijn Vrije Academie",
  set_password: "Bevestig je wachtwoord — Vrije Academie",
}

function setPasswordBody(code: string): string {
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

export function buildOtpEmailContent(purpose: OtpPurpose, code: string) {
  if (purpose === "login") {
    const validityMinutes = otpValidityMinutes("login")
    const { html, text } = buildOtpLoginEmail({
      code,
      validityMinutes,
      logoUrl: resolveOtpLoginLogoUrl(),
    })
    return emailContent({
      subject: PURPOSE_SUBJECT.login,
      text,
      html,
    })
  }

  return emailContent({
    subject: PURPOSE_SUBJECT.set_password,
    text: setPasswordBody(code),
  })
}

function logOtpToConsole(
  logger: { info: (msg: string) => void; warn: (msg: string) => void },
  input: { email: string; code: string; purpose: OtpPurpose }
): void {
  const content = buildOtpEmailContent(input.purpose, input.code)
  logger.warn(`[customer-otp] ${input.email} → ${input.code}`)
  logger.info(`[customer-otp] ${content.subject}\n${content.text}`)
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

  const content = buildOtpEmailContent(input.purpose, input.code)

  if (!hasEmailProvider()) {
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
      content,
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

export { otpValidityMinutes } from "./otp-ttl"
