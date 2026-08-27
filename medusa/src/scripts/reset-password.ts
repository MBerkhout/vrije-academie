/**
 * Admin helper: reset emailpass password for a user/customer by email.
 *
 *   npx medusa exec ./src/scripts/reset-password.ts -- \
 *     --email=mick@example.com \
 *     --password='new-secure-password'
 *
 * If --password is omitted, a random temporary password is generated and printed.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { resetCustomerPassword } from "../lib/customer-auth/helpers"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function resetPassword({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const email = arg("--email")?.trim().toLowerCase()
  const password = arg("--password")?.trim()

  if (!email) {
    logger.error("[reset-password] Usage: --email=<email> [--password='new-password']")
    return
  }

  try {
    const result = await resetCustomerPassword(container, email, password || undefined)
    logger.info(`[reset-password] Password reset for ${result.email}`)
    logger.info(`[reset-password] New password: ${result.password}`)
  } catch (err) {
    if (err instanceof MedusaError) {
      logger.error(`[reset-password] ${err.message}`)
      return
    }
    throw err
  }
}
