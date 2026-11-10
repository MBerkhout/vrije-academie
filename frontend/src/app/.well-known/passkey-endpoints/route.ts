import { getSiteOrigin } from '@/lib/json-ld'

export const revalidate = 86400

/** Passkey endpoints discovery (W3C well-known-urls-for-passkey-endpoints): where users enroll/manage passkeys. */
export function GET() {
  const url = `${getSiteOrigin()}/mijn-account/gegevens`
  return Response.json({ enroll: url, manage: url })
}
