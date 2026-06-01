const OAUTH_SETTINGS_ID = "default"

type RefreshLoader = () => Promise<{ refresh_token: string | null; instance_url: string | null }>

let refreshLoader: RefreshLoader | null = null
let dbCredentialsCached = false

export function registerSalesforceOAuthLoader(loader: RefreshLoader): void {
  refreshLoader = loader
}

export function markSalesforceDbOAuthCached(present: boolean): void {
  dbCredentialsCached = present
}

export function hasDbRefreshTokenCached(): boolean {
  return dbCredentialsCached
}

export async function resolveStoredOAuthCredentials(): Promise<{
  refresh_token: string | null
  instance_url: string | null
}> {
  const envToken = process.env.SALESFORCE_REFRESH_TOKEN?.trim()
  const envInstance = process.env.SALESFORCE_INSTANCE_URL?.trim()
  if (envToken) {
    return { refresh_token: envToken, instance_url: envInstance || null }
  }
  if (refreshLoader) {
    return await refreshLoader()
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
