import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const CART_ID_RE = /^\/store\/carts\/(cart_[A-Za-z0-9]+)/

/**
 * Medusa's cart update/complete workflows retrieve `cart.customer_id` and fail with
 * "Customer with id: cus_… was not found" when that customer was deleted (e.g. after a
 * customer purge + re-import). Null the stale link before the core handler runs.
 */
export async function detachStaleCartCustomer(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> {
  try {
    const cartId = CART_ID_RE.exec(req.path ?? "")?.[1]
    if (cartId) {
      const cartModule = req.scope.resolve(Modules.CART) as {
        retrieveCart: (id: string, cfg?: Record<string, unknown>) => Promise<{ customer_id?: string | null }>
        updateCarts: (id: string, data: Record<string, unknown>) => Promise<unknown>
      }
      const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
        listCustomers: (f: Record<string, unknown>, c?: Record<string, unknown>) => Promise<{ id: string }[]>
      }
      const cart = await cartModule.retrieveCart(cartId, { select: ["id", "customer_id"] })
      if (cart.customer_id) {
        const found = await customerModule.listCustomers(
          { id: cart.customer_id },
          { select: ["id"], take: 1 }
        )
        if (!found.length) {
          await cartModule.updateCarts(cartId, { customer_id: null })
        }
      }
    }
  } catch {
    /* non-blocking: unknown cart etc. is handled by the core route */
  }
  next()
}
