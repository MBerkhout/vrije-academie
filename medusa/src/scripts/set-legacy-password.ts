/**
 * One-off helper: set legacy password hash for a customer by email.
 *
 *   npx medusa exec ./src/scripts/set-legacy-password.ts -- \
 *     --email=mick@example.com \
 *     --hash='pbkdf2_sha256$...'
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getCustomerByEmail } from "../lib/customer-auth/helpers"
import { LEGACY_PASSWORD_MODULE } from "../modules/legacy-password"
import type LegacyPasswordModuleService from "../modules/legacy-password/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function setLegacyPassword({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const email = arg("--email")?.trim()
  const hash = arg("--hash")?.trim()

  if (!email || !hash) {
    logger.error("[set-legacy-password] Usage: --email=<email> --hash='<django-hash>'")
    return
  }

  const customer = await getCustomerByEmail(container, email)
  if (!customer) {
    logger.error(`[set-legacy-password] Customer not found: ${email}`)
    return
  }

  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >
  await legacyPassword.set(customer.id, hash)
  logger.info(`[set-legacy-password] Legacy password set for ${email} (customer ${customer.id})`)
}
