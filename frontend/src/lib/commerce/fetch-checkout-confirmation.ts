import { getMedusaBackendUrl } from '@/lib/commerce/medusa-backend-url'
import type { CheckoutConfirmationPayload } from '@/lib/commerce/checkout-confirmation-types'
import type { EventCard } from '@/lib/commerce/types'

const MEDUSA_BACKEND_URL = getMedusaBackendUrl()
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_API_KEY ?? ''

function storeHeaders(): HeadersInit {
  return PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {}
}

export async function fetchCheckoutConfirmation(params: {
  orderId?: string | null
  cartId?: string | null
  sessionId?: string | null
  token?: string | null
}): Promise<CheckoutConfirmationPayload> {
  const qs = new URLSearchParams()
  if (params.orderId?.trim()) qs.set('order_id', params.orderId.trim())
  if (params.cartId?.trim()) qs.set('cart_id', params.cartId.trim())
  if (params.sessionId?.trim()) qs.set('session_id', params.sessionId.trim())
  if (params.token?.trim()) qs.set('token', params.token.trim())

  const res = await fetch(`${MEDUSA_BACKEND_URL}/store/checkout/confirmation?${qs}`, {
    headers: storeHeaders(),
    cache: 'no-store',
  })

  if (res.status === 404) {
    return {
      status: 'pending',
      order: null,
      items: [],
      notices: { show_offline: false, show_online: false },
      vathuis_recommendations: [],
    }
  }

  if (!res.ok && res.status !== 202) {
    throw new Error('Kon bestelling niet ophalen')
  }

  const data = (await res.json()) as CheckoutConfirmationPayload & {
    vathuis_recommendations?: unknown[]
  }

  return {
    ...data,
    vathuis_recommendations: (data.vathuis_recommendations ?? []).map((row) =>
      row as EventCard
    ),
  }
}