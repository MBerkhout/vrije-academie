import { cookies } from 'next/headers'
import { commerceClient } from '@/lib/commerce'
import { CART_COOKIE } from '@/lib/commerce/cart-cookie-name'

function isCartCompleted(cart: { completed_at?: string | null } | null): boolean {
  return Boolean(cart?.completed_at?.trim())
}

function lineItemCount(
  cart: { items?: { quantity?: number }[]; line_items?: { quantity?: number }[] } | null
): number {
  const items = cart?.items ?? cart?.line_items ?? []
  return items.reduce((sum, line) => sum + (line.quantity ?? 0), 0)
}

export async function GET() {
  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE)?.value
  if (!cartId) {
    return Response.json({ count: 0 })
  }
  try {
    const cart = await commerceClient.getCart(cartId)
    if (!cart || isCartCompleted(cart)) {
      return Response.json({ count: 0 })
    }
    return Response.json({ count: lineItemCount(cart) })
  } catch {
    return Response.json({ count: 0 })
  }
}
