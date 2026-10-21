import { existsSync, readFileSync } from "fs"
import { join } from "path"

import { escapeHtml } from "../../../lib/email-content"

const DEFAULT_STOREFRONT_PUBLIC_URL = "https://v2.vrijeacademie.nl"
const LOGO_PATH = "/branding/logo-email.png"
const OTP_LOGIN_TEMPLATE_REL =
  "modules/customer-otp/templates/otp-login.email.html"

let cachedTemplate: string | undefined

function resolveOtpLoginTemplatePath(): string {
  const candidates = [
    join(process.cwd(), "src", OTP_LOGIN_TEMPLATE_REL),
    join(process.cwd(), "dist", OTP_LOGIN_TEMPLATE_REL),
    join(process.cwd(), ".medusa/server/src", OTP_LOGIN_TEMPLATE_REL),
  ]
  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  throw new Error(
    "OTP login email template not found (expected otp-login.email.html next to compiled lib or under src/dist modules)"
  )
}

function otpLoginTemplate(): string {
  if (cachedTemplate) return cachedTemplate
  cachedTemplate = readFileSync(resolveOtpLoginTemplatePath(), "utf8")
  return cachedTemplate
}

export function resolveOtpLoginLogoUrl(
  env: Record<string, string | undefined> = process.env
): string {
  const base =
    env.STOREFRONT_PUBLIC_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_STOREFRONT_PUBLIC_URL
  return `${base}${LOGO_PATH}`
}

function otpLoginPlainText(code: string, validityMinutes: number): string {
  return [
    "Goedendag,",
    "",
    "Je wilt inloggen bij Mijn Vrije Academie. Vul onderstaande code in op de website:",
    "",
    code,
    "",
    `De code is ${validityMinutes} minuten geldig en werkt maar één keer.`,
    "",
    "Let op: medewerkers van Vrije Academie vragen nooit om deze code. Deel hem met niemand, ook niet telefonisch.",
    "",
    "Heb je niet geprobeerd in te loggen? Dan kun je deze mail negeren. Je account blijft veilig.",
    "",
    "Vragen? Neem contact met ons op: https://www.vrijeacademie.nl/over-ons/contact/",
    "",
    "Hartelijke groet,",
    "Vrije Academie",
    "",
    "—",
    "Vrije Academie, Herengracht 368, 1016 CH Amsterdam",
    "https://www.vrijeacademie.nl",
    "",
    "Je ontvangt deze mail omdat iemand met dit e-mailadres een inlogcode heeft aangevraagd.",
  ].join("\n")
}

export function buildOtpLoginEmail(input: {
  code: string
  validityMinutes: number
  logoUrl: string
}): { html: string; text: string } {
  const safeCode = escapeHtml(input.code)
  const html = otpLoginTemplate()
    .replaceAll("[LOGO_URL]", escapeHtml(input.logoUrl))
    .replaceAll("{{CODE}}", safeCode)
    .replaceAll("{{GELDIGHEID}}", String(input.validityMinutes))

  return {
    html,
    text: otpLoginPlainText(input.code, input.validityMinutes),
  }
}
