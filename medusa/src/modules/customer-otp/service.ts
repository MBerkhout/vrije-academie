import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto"

import { sendOtpEmail, type OtpPurpose } from "./lib/send-otp-email"
import { otpTtlMs } from "./lib/otp-ttl"
import { CustomerOtpChallenge } from "./models/customer-otp-challenge"
const MAX_REQUESTS_PER_WINDOW = 3
const REQUEST_WINDOW_MS = 15 * 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5
const MAX_IMPERSONATE_ISSUES_PER_ADMIN = 5

export const IMPERSONATION_CHALLENGE_EMAIL_RE =
  /^impersonate:([^:]+):by:(.+)$/

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex")
}

function codesMatch(storedHash: string, code: string): boolean {
  const incoming = Buffer.from(hashCode(code), "hex")
  const stored = Buffer.from(storedHash, "hex")
  if (incoming.length !== stored.length) return false
  return timingSafeEqual(incoming, stored)
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

function generateImpersonationCode(): string {
  return randomBytes(24).toString("base64url")
}

export function buildImpersonationChallengeEmail(
  customerId: string,
  adminUserId: string
): string {
  return `impersonate:${customerId}:by:${adminUserId}`
}

export function parseImpersonationChallengeEmail(
  email: string
): { customerId: string; adminUserId: string } | null {
  const match = IMPERSONATION_CHALLENGE_EMAIL_RE.exec(email)
  if (!match) return null
  return { customerId: match[1], adminUserId: match[2] }
}

class CustomerOtpModuleService extends MedusaService({
  CustomerOtpChallenge,
}) {
  async createChallenge(
    container: { resolve: (key: string) => unknown },
    email: string,
    purpose: OtpPurpose
  ): Promise<void> {
    const normalized = normalizeEmail(email)
    const since = new Date(Date.now() - REQUEST_WINDOW_MS)
    const recent = await this.listCustomerOtpChallenges(
      { email: normalized, purpose },
      { take: 20 }
    )
    const recentCount = recent.filter(
      (row) => row.created_at && new Date(row.created_at) >= since
    ).length
    if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Too many verification codes requested. Try again later."
      )
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + otpTtlMs(purpose))

    await this.createCustomerOtpChallenges({
      email: normalized,
      code_hash: hashCode(code),
      purpose,
      expires_at: expiresAt,
      attempts: 0,
    })

    await sendOtpEmail(container, { email: normalized, code, purpose })
  }

  async createAdminChallenge(
    email: string,
    purpose: OtpPurpose = "login"
  ): Promise<{ code: string; expires_at: string }> {
    const normalized = normalizeEmail(email)
    const code = generateCode()
    const expiresAt = new Date(Date.now() + otpTtlMs(purpose))

    await this.createCustomerOtpChallenges({
      email: normalized,
      code_hash: hashCode(code),
      purpose,
      expires_at: expiresAt,
      attempts: 0,
    })

    return { code, expires_at: expiresAt.toISOString() }
  }

  async verifyChallenge(
    email: string,
    code: string,
    purpose: OtpPurpose
  ): Promise<void> {
    const normalized = normalizeEmail(email)
    const rows = await this.listCustomerOtpChallenges(
      { email: normalized, purpose },
      { take: 1, order: { created_at: "DESC" } }
    )
    const challenge = rows[0]
    if (!challenge) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid or expired verification code"
      )
    }

    if (new Date(challenge.expires_at) < new Date()) {
      await this.deleteCustomerOtpChallenges(challenge.id)
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid or expired verification code"
      )
    }

    const attempts = Number(challenge.attempts ?? 0)
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await this.deleteCustomerOtpChallenges(challenge.id)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Too many attempts. Request a new code."
      )
    }

    if (!codesMatch(challenge.code_hash, code.trim())) {
      await this.updateCustomerOtpChallenges({
        id: challenge.id,
        attempts: attempts + 1,
      })
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid or expired verification code"
      )
    }

    await this.deleteCustomerOtpChallenges(challenge.id)
  }

  /**
   * Admin-issued one-time handoff code (not emailed). Stored under synthetic email key.
   */
  async createImpersonationChallenge(
    customerId: string,
    adminUserId: string
  ): Promise<{ code: string; expires_at: string }> {
    if (!customerId?.trim() || !adminUserId?.trim()) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "customerId and adminUserId required")
    }

    const challengeEmail = buildImpersonationChallengeEmail(customerId.trim(), adminUserId.trim())
    const since = new Date(Date.now() - REQUEST_WINDOW_MS)
    const recent = await this.listCustomerOtpChallenges(
      { purpose: "impersonate" as OtpPurpose },
      { take: 50, order: { created_at: "DESC" } }
    )
    const adminSuffix = `:by:${adminUserId.trim()}`
    const adminIssues = recent.filter(
      (row) =>
        (row.email?.endsWith(adminSuffix) ?? false) &&
        row.created_at &&
        new Date(row.created_at) >= since
    ).length
    if (adminIssues >= MAX_IMPERSONATE_ISSUES_PER_ADMIN) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Too many impersonation codes requested. Try again later."
      )
    }

    const code = generateImpersonationCode()
    const expiresAt = new Date(Date.now() + otpTtlMs("impersonate"))

    await this.createCustomerOtpChallenges({
      email: challengeEmail,
      code_hash: hashCode(code),
      purpose: "impersonate",
      expires_at: expiresAt,
      attempts: 0,
    })

    return { code, expires_at: expiresAt.toISOString() }
  }

  /**
   * Consumes a single impersonation handoff code and returns linked ids.
   */
  async exchangeImpersonationCode(
    code: string
  ): Promise<{ customerId: string; adminUserId: string }> {
    const trimmed = code?.trim()
    if (!trimmed) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid or expired code")
    }

    const since = new Date(Date.now() - otpTtlMs("impersonate") * 2)
    const rows = await this.listCustomerOtpChallenges(
      { purpose: "impersonate" as OtpPurpose },
      { take: 30, order: { created_at: "DESC" } }
    )

    const candidates = rows.filter(
      (row) => row.created_at && new Date(row.created_at) >= since
    )

    for (const challenge of candidates) {
      if (new Date(challenge.expires_at) < new Date()) {
        await this.deleteCustomerOtpChallenges(challenge.id)
        continue
      }

      const attempts = Number(challenge.attempts ?? 0)
      if (attempts >= MAX_VERIFY_ATTEMPTS) {
        await this.deleteCustomerOtpChallenges(challenge.id)
        continue
      }

      if (!codesMatch(challenge.code_hash, trimmed)) {
        continue
      }

      const parsed = parseImpersonationChallengeEmail(challenge.email ?? "")
      if (!parsed) {
        await this.deleteCustomerOtpChallenges(challenge.id)
        throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid or expired code")
      }

      await this.deleteCustomerOtpChallenges(challenge.id)
      return parsed
    }

    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid or expired code")
  }
}

export default CustomerOtpModuleService

export { otpValidityMinutes } from "./lib/otp-ttl"
