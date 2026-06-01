/**
 * Node does not load `.env` files by default. Studio reads `sanity/.env` via Vite; CLI scripts do not.
 * Loads the first file found: `sanity/.env` (relative to this file), then `process.cwd()/.env`.
 * Does not override variables already set in the environment.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export function loadEnvFromSanityDir() {
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const paths = [join(scriptDir, "..", ".env"), join(process.cwd(), ".env")]

  for (const p of paths) {
    if (!existsSync(p)) continue
    const raw = readFileSync(p, "utf8")
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
    return
  }
}
