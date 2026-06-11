import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { createHash, randomInt, timingSafeEqual } from "crypto"

import { sendOtpEmail, type OtpPurpose } from "./lib/send-otp-email"
import { CustomerOtpChallenge } from "./models/customer-otp-challenge"

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 3
const REQUEST_WINDOW_MS = 15 * 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5

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
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await this.createCustomerOtpChallenges({
      email: normalized,
      code_hash: hashCode(code),
      purpose,
      expires_at: expiresAt,
      attempts: 0,
    })

    await sendOtpEmail(container, { email: normalized, code, purpose })
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
}

export default CustomerOtpModuleService
