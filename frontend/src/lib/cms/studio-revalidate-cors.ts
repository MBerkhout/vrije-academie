const LOCAL_STUDIO_ORIGINS = new Set(['http://localhost:3333', 'http://127.0.0.1:3333'])
const HOSTED_STUDIO_ORIGIN = /^https:\/\/[a-z0-9-]+\.sanity\.studio$/i

function extraStudioOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL?.trim()
  if (!raw) return []
  try {
    return [new URL(raw).origin]
  } catch {
    return []
  }
}

export function allowStudioRevalidateOrigin(
  origin: string | null | undefined,
): origin is string {
  if (!origin) return false
  if (LOCAL_STUDIO_ORIGINS.has(origin)) return true
  if (HOSTED_STUDIO_ORIGIN.test(origin)) return true
  return extraStudioOrigins().includes(origin)
}

export function studioRevalidateCorsHeaders(
  origin: string | null | undefined,
): Record<string, string> {
  if (!allowStudioRevalidateOrigin(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
