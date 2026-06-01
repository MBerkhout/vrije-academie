import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export type RedirectRule = {
  source: string
  destination: string
  permanent: boolean
}

const REDIRECTS_QUERY = `*[_type == "redirect" && enabled == true]{
  "source": source,
  "permanent": permanent,
  "destination": select(
    destinationType == "page" => select(
      destinationPage->slug.current == "/" => "/",
      "/" + destinationPage->slug.current
    ),
    destinationUrl
  )
}`

const CACHE_TTL_MS = 60_000

let cachedRedirects: RedirectRule[] | null = null
let cachedAt = 0

function getClient() {
  if (!projectId) {
    throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID')
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: true,
  })
}

export function normalizeRedirectPath(pathname: string): string {
  if (!pathname) return '/'
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

function isValidRedirect(row: {
  source?: string | null
  destination?: string | null
  permanent?: boolean | null
}): row is RedirectRule {
  return Boolean(row.source && row.destination)
}

export async function getRedirects(): Promise<RedirectRule[]> {
  const now = Date.now()
  if (cachedRedirects && now - cachedAt < CACHE_TTL_MS) {
    return cachedRedirects
  }

  const rows = await getClient().fetch<
    Array<{
      source?: string | null
      destination?: string | null
      permanent?: boolean | null
    }>
  >(REDIRECTS_QUERY)

  cachedRedirects = rows.filter(isValidRedirect).map((row) => ({
    source: normalizeRedirectPath(row.source),
    destination: row.destination,
    permanent: row.permanent !== false,
  }))
  cachedAt = now

  return cachedRedirects
}

export async function findRedirect(pathname: string): Promise<RedirectRule | null> {
  const normalizedPath = normalizeRedirectPath(pathname)
  const redirects = await getRedirects()
  return redirects.find((rule) => rule.source === normalizedPath) ?? null
}
