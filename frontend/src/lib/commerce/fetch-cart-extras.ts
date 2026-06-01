import { getMedusaBackendUrl } from '@/lib/commerce/medusa-backend-url'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'

const MEDUSA_BACKEND_URL = getMedusaBackendUrl()
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_API_KEY ?? ''

function storeHeaders(): HeadersInit {
  return PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {}
}

export async function fetchCartExtras(cartId: string): Promise<CartItemExtras[]> {
  try {
    const r = await fetch(
      `${MEDUSA_BACKEND_URL}/store/cart/extras?cart_id=${encodeURIComponent(cartId)}`,
      { headers: storeHeaders() }
    )
    if (!r.ok) return []
    const data = (await r.json()) as { extras?: CartItemExtras[] }
    return data.extras ?? []
  } catch {
    return []
  }
}
