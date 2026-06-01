/**
 * HubSpot forms API route for Sanity form-toolkit.
 * Sanity Studio fetches this URL to populate the HubSpot form selector.
 * Requires HUBSPOT_TOKEN (Private App access token) in .env.
 * @see https://github.com/sanity-io/form-toolkit
 * Uses native fetch to avoid pulling React dependencies into API route.
 */
export async function GET() {
  const token = process.env.HUBSPOT_TOKEN ?? ""
  if (!token) {
    return Response.json([])
  }
  try {
    const apiResponse = await fetch("https://api.hubapi.com/marketing/v3/forms/?limit=9999", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!apiResponse.ok) {
      return Response.json([])
    }
    const { results } = await apiResponse.json()
    const data = (results ?? []).map((r: { id: string; [key: string]: unknown }) => ({ ...r, value: r.id }))
    return Response.json(data)
  } catch {
    return Response.json([])
  }
}
