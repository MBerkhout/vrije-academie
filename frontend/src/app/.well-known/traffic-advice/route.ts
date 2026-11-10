export const dynamic = 'force-static'

/** Chrome Private Prefetch Proxy: allow prefetch traffic to this site. */
export function GET() {
  return new Response(
    JSON.stringify([{ user_agent: 'prefetch-proxy', google_prefetch_proxy_eligible: true }]),
    { headers: { 'Content-Type': 'application/trafficadvice+json' } },
  )
}
