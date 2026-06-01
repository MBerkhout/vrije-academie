/**
 * Medusa Store API base URL (no trailing slash).
 * Set `NEXT_PUBLIC_MEDUSA_BACKEND_URL` in the environment — there is no localhost default.
 */
export function getMedusaBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim()
  if (!raw) {
    throw new Error(
      'NEXT_PUBLIC_MEDUSA_BACKEND_URL must be set (see frontend/.env.example).'
    )
  }
  return raw.replace(/\/$/, '')
}
