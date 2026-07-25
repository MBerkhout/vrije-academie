/**
 * Verify a Django PBKDF2 password hash against a plaintext password.
 *
 *   npx medusa exec ./src/scripts/verify-legacy-password.ts -- \
 *     --hash='pbkdf2_sha256$150000$L1HYAziUX37G$DYy9VQaENqqZKFO0IfA5WITGXVs+olzu0hscyn2Zac0=' \
 *     --password='your-plaintext'
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { verifyDjangoPbkdf2Password } from "../lib/customer-auth/django-pbkdf2"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function verifyLegacyPassword({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const hash = arg("--hash")?.trim()
  const password = arg("--password")

  if (!hash || password === undefined) {
    logger.error(
      "[verify-legacy-password] Usage: --hash='<django-hash>' --password='<plaintext>'"
    )
    return
  }

  const valid = verifyDjangoPbkdf2Password(password, hash)
  if (valid) {
    logger.info("[verify-legacy-password] Password matches the hash.")
  } else {
    logger.warn("[verify-legacy-password] Password does NOT match the hash.")
  }
}
