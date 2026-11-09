/**
 * Bulk-import active legacy website users (email + Django PBKDF2 hash) into Medusa.
 * Does not send mail, OTP, or call Salesforce. Profile/address fill on first login pull.
 *
 * CSV columns: last_login,is_active,sfid,id,password,username,email
 * Default file: users_with_passwords.csv (repo root or cwd).
 *
 *   npm run legacy:import-users
 *   npx medusa exec ./src/scripts/import-users-with-passwords.ts -- --dry-run --limit=20
 *   npx medusa exec ./src/scripts/import-users-with-passwords.ts -- --email=you@example.com
 *   npx medusa exec ./src/scripts/import-users-with-passwords.ts -- --file=../users_with_passwords.csv
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import {
  assertValidEmail,
  customerHasMedusaPassword,
  normalizeCustomerEmail,
} from "../lib/customer-auth/helpers"
import { LEGACY_PASSWORD_MODULE } from "../modules/legacy-password"
import type LegacyPasswordModuleService from "../modules/legacy-password/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

const LOG = "[import-users-with-passwords]"
const PBKDF2_PREFIX = "pbkdf2_sha256$"
const SF_CONTACT_PREFIX = "003"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

function resolveDefaultFilePath(): string {
  const fromArg = arg("--file")?.trim()
  if (fromArg) return resolve(fromArg)

  const candidates = [
    resolve(process.cwd(), "../users_with_passwords.csv"),
    resolve(process.cwd(), "users_with_passwords.csv"),
  ]
  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return candidates[0]
}

/** Minimal RFC 4180 row parser (quoted fields may contain commas). */
export function parseCsvRows(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ",") {
      row.push(field)
      field = ""
      continue
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && content[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((c) => c.length > 0)) rows.push(row)
      row = []
      continue
    }
    field += ch
  }

  row.push(field)
  if (row.some((c) => c.length > 0)) rows.push(row)
  return rows
}

type LegacyUserRow = {
  email: string
  passwordHash: string
  username: string
  sfid: string
  lastLoginMs: number
}

function parseLastLoginMs(raw: string): number {
  const t = raw.trim()
  if (!t) return 0
  const ms = Date.parse(t)
  return Number.isFinite(ms) ? ms : 0
}

export function rowsFromCsv(content: string): LegacyUserRow[] {
  const matrix = parseCsvRows(content)
  if (!matrix.length) return []

  const header = matrix[0].map((h) => h.trim().toLowerCase())
  const emailIdx = header.indexOf("email")
  const passwordIdx = header.indexOf("password")
  const activeIdx = header.indexOf("is_active")
  const usernameIdx = header.indexOf("username")
  const sfidIdx = header.indexOf("sfid")
  const lastLoginIdx = header.indexOf("last_login")

  if (emailIdx < 0 || passwordIdx < 0 || activeIdx < 0) {
    return []
  }

  const parsed: LegacyUserRow[] = []
  for (const cells of matrix.slice(1)) {
    const active = (cells[activeIdx] ?? "").trim().toLowerCase()
    if (active !== "true" && active !== "1" && active !== "yes") continue

    let emailRaw = (cells[emailIdx] ?? "").trim()
    const username = usernameIdx >= 0 ? (cells[usernameIdx] ?? "").trim() : ""
    if (!emailRaw && username) {
      emailRaw = username
    }

    const passwordHash = (cells[passwordIdx] ?? "").trim()
    if (!emailRaw || !passwordHash.startsWith(PBKDF2_PREFIX)) continue

    let email: string
    try {
      email = assertValidEmail(emailRaw)
    } catch {
      continue
    }

    const lastLoginMs =
      lastLoginIdx >= 0 ? parseLastLoginMs(cells[lastLoginIdx] ?? "") : 0

    parsed.push({
      email,
      passwordHash,
      username,
      sfid: sfidIdx >= 0 ? (cells[sfidIdx] ?? "").trim() : "",
      lastLoginMs,
    })
  }

  const byEmail = new Map<string, LegacyUserRow>()
  for (const row of parsed) {
    const existing = byEmail.get(row.email)
    if (!existing || row.lastLoginMs >= existing.lastLoginMs) {
      byEmail.set(row.email, row)
    }
  }
  return [...byEmail.values()]
}

async function ensureSalesforceLink(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  customerId: string,
  sfid: string
): Promise<void> {
  const contactId = sfid.startsWith(SF_CONTACT_PREFIX) ? sfid : null
  if (!contactId) return

  const existing = await sync.getStateByMedusaId("customer", customerId)
  if (existing?.salesforce_id?.trim()) return

  if (existing) {
    await sync.updateSalesforceSyncStates({
      id: existing.id,
      salesforce_id: contactId,
      last_status: "legacy_import",
    })
    return
  }

  await sync.createSalesforceSyncStates([
    {
      entity_type: "customer",
      medusa_id: customerId,
      salesforce_id: contactId,
      last_status: "legacy_import",
    },
  ])
}

export default async function importUsersWithPasswords({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const filePath = resolveDefaultFilePath()
  const dryRun = process.argv.includes("--dry-run")
  const limit = Math.max(0, Number(arg("--limit")) || 0)
  const emailArg = arg("--email")?.trim()
  let emailFilter: string | null = null
  if (emailArg) {
    try {
      emailFilter = assertValidEmail(emailArg)
    } catch {
      logger.error(`${LOG} Invalid --email value: ${emailArg}`)
      return
    }
  }

  if (!existsSync(filePath)) {
    logger.error(`${LOG} File not found: ${filePath}`)
    logger.error(`${LOG} Usage: [--file=path] [--dry-run] [--limit=N] [--email=addr]`)
    return
  }

  const content = readFileSync(filePath, "utf8")
  let allRows = rowsFromCsv(content)

  if (emailFilter) {
    allRows = allRows.filter((row) => row.email === emailFilter)
    if (!allRows.length) {
      logger.warn(
        `${LOG} No active valid row for email=${emailFilter} in ${filePath} (check is_active and password hash)`
      )
      return
    }
  }

  const rows = limit > 0 ? allRows.slice(0, limit) : allRows

  if (!allRows.length) {
    logger.warn(`${LOG} No active valid rows in ${filePath}`)
    return
  }

  logger.info(
    `${LOG} Processing ${rows.length} row(s) from ${filePath}` +
      (dryRun ? " (dry-run)" : "") +
      (limit ? ` (limit=${limit})` : "") +
      (emailFilter ? ` (email=${emailFilter})` : "")
  )

  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  let imported = 0
  let skippedExisting = 0
  let failed = 0
  let inactiveOrInvalid = content.length ? 0 : 0

  const rawMatrix = parseCsvRows(content)
  const dataRowCount = Math.max(0, rawMatrix.length - 1)
  inactiveOrInvalid = dataRowCount - allRows.length

  for (const row of rows) {
    const email = normalizeCustomerEmail(row.email)

    try {
      const [customers] = await customerService.listAndCountCustomers(
        { email },
        { take: 1, select: ["id"] }
      )
      const existing = customers[0]

      if (existing) {
        skippedExisting++
        logger.info(`${LOG} Skip (customer exists): ${email}`)
        continue
      }

      if (await customerHasMedusaPassword(container, email)) {
        skippedExisting++
        logger.info(`${LOG} Skip (Medusa password): ${email}`)
        continue
      }

      if (dryRun) {
        imported++
        logger.info(
          `${LOG} Would import: ${email} sfid=${row.sfid || "-"} user=${row.username || "-"}`
        )
        continue
      }

      const metadata: Record<string, unknown> = { legacy_import_pending: true }
      if (row.username) metadata.legacy_username = row.username
      if (row.sfid) metadata.legacy_sfid = row.sfid

      const [customer] = await customerService.createCustomers([
        {
          email,
          first_name: "",
          last_name: "",
          has_account: true,
          metadata,
        },
      ])

      await legacyPassword.set(customer.id, row.passwordHash)
      await ensureSalesforceLink(sync, customer.id, row.sfid)

      imported++
      logger.info(`${LOG} Imported: ${email} → ${customer.id}`)
    } catch (err) {
      failed++
      logger.warn(`${LOG} Failed ${email}: ${(err as Error).message}`)
    }
  }

  logger.info(
    `${LOG} Done. imported=${imported} skipped_existing=${skippedExisting} ` +
      `inactive_or_invalid=${inactiveOrInvalid} failed=${failed} dryRun=${dryRun}`
  )
}
