const OAUTH_SETTINGS_ID = "default"

type RefreshLoader = () => Promise<{ refresh_token: string | null; instance_url: string | null }>

type RefreshTokenSaver = (refreshToken: string) => Promise<void>

let refreshLoader: RefreshLoader | null = null
let refreshTokenSaver: RefreshTokenSaver | null = null
let dbCredentialsCached = false

export function registerSalesforceOAuthLoader(loader: RefreshLoader): void {
  refreshLoader = loader
}

/** Persist a rotated refresh token from a token response. */
export function registerSalesforceRefreshTokenSaver(saver: RefreshTokenSaver): void {
  refreshTokenSaver = saver
}

/** @returns false when rotation could not be stored (next refresh may fail). */
export async function persistRotatedRefreshToken(refreshToken: string): Promise<boolean> {
  const token = refreshToken.trim()
  if (!token || !refreshTokenSaver) return false
  await refreshTokenSaver(token)
  return true
}

export function markSalesforceDbOAuthCached(present: boolean): void {
  dbCredentialsCached = present
}

export function hasDbRefreshTokenCached(): boolean {
  return dbCredentialsCached
}

/**
 * Refresh token for API calls. Database (Admin connect) wins over env so token rotation
 * persisted in Postgres is actually used — env `SALESFORCE_REFRESH_TOKEN` is a fallback only.
 */
export async function resolveStoredOAuthCredentials(): Promise<{
  refresh_token: string | null
  instance_url: string | null
}> {
  const envToken = process.env.SALESFORCE_REFRESH_TOKEN?.trim()
  const envInstance = process.env.SALESFORCE_INSTANCE_URL?.trim()

  if (refreshLoader) {
    const fromDb = await refreshLoader()
    const dbToken = fromDb.refresh_token?.trim()
    if (dbToken) {
      return {
        refresh_token: dbToken,
        instance_url: fromDb.instance_url?.trim() || envInstance || null,
      }
    }
  }

  if (envToken) {
    return { refresh_token: envToken, instance_url: envInstance || null }
  }

  return { refresh_token: null, instance_url: null }
}

export async function resolveRefreshTokenForAuth(): Promise<string> {
  const { refresh_token } = await resolveStoredOAuthCredentials()
  if (!refresh_token) {
    throw new Error(
      "No Salesforce refresh token — connect in Admin (Salesforce sync) or set SALESFORCE_REFRESH_TOKEN"
    )
  }
  return refresh_token
}

export { OAUTH_SETTINGS_ID }
