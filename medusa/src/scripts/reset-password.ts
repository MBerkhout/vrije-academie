/**
 * Admin helper: reset emailpass password for a user/customer by email.
 *
 *   npx medusa exec ./src/scripts/reset-password.ts -- \
 *     --email=mick@example.com \
 *     --password='new-secure-password'
 *
 * If --password is omitted, a random temporary password is generated and printed.
 */
import { randomBytes } from "node:crypto"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  ensurePasswordlessAuthIdentity,
  findAuthIdentityByEmail,
  getCustomerByEmail,
  linkAuthIdentityToCustomer,
} from "../lib/customer-auth/helpers"
import { LEGACY_PASSWORD_MODULE } from "../modules/legacy-password"
import type LegacyPasswordModuleService from "../modules/legacy-password/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function generateTemporaryPassword(): string {
  const suffix = randomBytes(6).toString("base64url")
  return `VaTemp-${suffix}!`
}

export default async function resetPassword({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const email = arg("--email")?.trim().toLowerCase()
  let password = arg("--password")?.trim()

  if (!email) {
    logger.error("[reset-password] Usage: --email=<email> [--password='new-password']")
    return
  }

  if (!password) {
    password = generateTemporaryPassword()
  } else if (password.length < 8) {
    logger.error("[reset-password] Password must be at least 8 characters")
    return
  }

  const customer = await getCustomerByEmail(container, email)
  let authIdentity = await findAuthIdentityByEmail(container, email)

  if (!authIdentity && !customer) {
    logger.error(`[reset-password] No auth identity or customer found for: ${email}`)
    return
  }

  if (!authIdentity) {
    authIdentity = await ensurePasswordlessAuthIdentity(container, email)
  }

  if (customer && !authIdentity.app_metadata?.customer_id) {
    await linkAuthIdentityToCustomer(container, authIdentity.id, customer.id)
  }

  const auth = container.resolve(Modules.AUTH) as {
    updateProvider: (
      provider: string,
      data: Record<string, unknown>
    ) => Promise<{ success: boolean; error?: string }>
  }

  const updated = await auth.updateProvider("emailpass", {
    entity_id: email,
    password,
  })

  if (!updated.success) {
    logger.error(`[reset-password] Failed: ${updated.error ?? "unknown error"}`)
    return
  }

  if (customer) {
    const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
      typeof LegacyPasswordModuleService
    >
    await legacyPassword.deleteByCustomerId(customer.id)
  }

  logger.info(`[reset-password] Password reset for ${email}`)
  logger.info(`[reset-password] New password: ${password}`)
}
