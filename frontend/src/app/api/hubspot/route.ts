import { studioRevalidateCorsHeaders } from '@/lib/cms/studio-revalidate-cors'

const HUBSPOT_CORS_METHODS = 'GET, OPTIONS'

function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: studioRevalidateCorsHeaders(req.headers.get('origin'), HUBSPOT_CORS_METHODS),
  })
}

/**
 * HubSpot forms API route for Sanity form-toolkit.
 * Sanity Studio fetches this URL to populate the HubSpot form selector.
 * Requires HUBSPOT_TOKEN (Private App access token) in .env.
 * @see https://github.com/sanity-io/form-toolkit
 * Uses native fetch to avoid pulling React dependencies into API route.
 */
export async function OPTIONS(req: Request): Promise<Response> {
  const headers = studioRevalidateCorsHeaders(req.headers.get('origin'), HUBSPOT_CORS_METHODS)
  if (!headers['Access-Control-Allow-Origin']) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, { status: 204, headers })
}

export async function GET(req: Request) {
  const token = process.env.HUBSPOT_TOKEN ?? ''
  if (!token) {
    return jsonResponse(req, [])
  }
  try {
    const apiResponse = await fetch('https://api.hubapi.com/marketing/v3/forms/?limit=9999', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!apiResponse.ok) {
      return jsonResponse(req, [])
    }
    const { results } = await apiResponse.json()
    const data = (results ?? []).map((r: { id: string; [key: string]: unknown }) => ({ ...r, value: r.id }))
    return jsonResponse(req, data)
  } catch {
    return jsonResponse(req, [])
  }
}
