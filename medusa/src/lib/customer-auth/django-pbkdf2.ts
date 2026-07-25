import { pbkdf2Sync, timingSafeEqual } from "crypto"

const DJANGO_PBKDF2_PREFIX = "pbkdf2_sha256"

export type DjangoPbkdf2Parts = {
  algorithm: string
  iterations: number
  salt: string
  hash: Buffer
}

export function parseDjangoPbkdf2(encoded: string): DjangoPbkdf2Parts | null {
  const parts = encoded.split("$")
  if (parts.length !== 4) return null

  const [algorithm, iterationsStr, salt, hashB64] = parts
  if (algorithm !== DJANGO_PBKDF2_PREFIX) return null

  const iterations = Number.parseInt(iterationsStr, 10)
  if (!Number.isFinite(iterations) || iterations <= 0) return null
  if (!salt || !hashB64) return null

  let hash: Buffer
  try {
    hash = Buffer.from(hashB64, "base64")
  } catch {
    return null
  }
  if (hash.length === 0) return null

  return { algorithm, iterations, salt, hash }
}

export function verifyDjangoPbkdf2Password(password: string, encoded: string): boolean {
  const parsed = parseDjangoPbkdf2(encoded)
  if (!parsed) return false

  const derived = pbkdf2Sync(
    password,
    parsed.salt,
    parsed.iterations,
    parsed.hash.length,
    "sha256"
  )

  if (derived.length !== parsed.hash.length) return false
  return timingSafeEqual(derived, parsed.hash)
}
