/**
 * Check whether a customer still has a legacy password hash.
 *
 *   npx medusa exec ./src/scripts/check-legacy-password.ts -- --email=mick@example.com
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { customerHasLegacyPassword, customerHasMedusaPassword } from "../lib/customer-auth/helpers"
import { LEGACY_PASSWORD_MODULE } from "../modules/legacy-password"
import type LegacyPasswordModuleService from "../modules/legacy-password/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function checkLegacyPassword({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const email = arg("--email")?.trim()

  if (!email) {
    logger.error("[check-legacy-password] Usage: --email=<email>")
    return
  }

  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >
  const row = await legacyPassword.getByEmail(container, email)
  const hasLegacy = await customerHasLegacyPassword(container, email)
  const hasMedusa = await customerHasMedusaPassword(container, email)

  logger.info(`[check-legacy-password] email=${email}`)
  logger.info(`[check-legacy-password] hasLegacyPassword=${hasLegacy}`)
  logger.info(`[check-legacy-password] hasMedusaPassword=${hasMedusa}`)
  if (row) {
    logger.info(`[check-legacy-password] legacy row id=${row.id} customer_id=${row.customer_id}`)
  } else {
    logger.info("[check-legacy-password] No legacy password row found (migration complete or never set).")
  }
}
