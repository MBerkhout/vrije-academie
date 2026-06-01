import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getMedusaBackendUrl } from '@/lib/commerce/medusa-backend-url'

const BACKEND_URL = getMedusaBackendUrl()
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_API_KEY ?? ''

/**
 * GET /api/customer/me
 *
 * Proxies the Medusa customer retrieve call server-side, forwarding cookies.
 * Returns { customer } or { customer: null } — never throws.
 */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
      headers: {
        cookie: req.headers.get('cookie') ?? '',
        ...(PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {}),
      },
      credentials: 'include',
    })
    if (!res.ok) {
      return NextResponse.json({ customer: null })
    }
    const data = await res.json()
    return NextResponse.json({ customer: data.customer ?? null })
  } catch {
    return NextResponse.json({ customer: null })
  }
}
