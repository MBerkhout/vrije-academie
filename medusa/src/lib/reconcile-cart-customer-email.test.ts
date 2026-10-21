import { describe, expect, it, vi } from "vitest"

import { reconcileCartCustomerWithEmail } from "./reconcile-cart-customer-email"

describe("reconcileCartCustomerWithEmail", () => {
  it("does nothing when cart email matches linked customer", async () => {
    const transfer = vi.fn()
    const updateCarts = vi.fn()
    const container = {
      resolve: (key: string) => {
        if (key === "query") {
          return {
            graph: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "cart_1",
                  email: "buyer@example.com",
                  customer_id: "cus_a",
                },
              ],
            }),
          }
        }
        if (key === "customer") {
          return {
            retrieveCustomer: vi.fn().mockResolvedValue({
              id: "cus_a",
              email: "buyer@example.com",
            }),
          }
        }
        if (key === "workflowEngine") return { run: transfer }
        if (key === "cart") return { updateCarts }
        throw new Error(`unexpected ${key}`)
      },
    }

    const result = await reconcileCartCustomerWithEmail(container as never, "cart_1")
    expect(result.changed).toBe(false)
    expect(transfer).not.toHaveBeenCalled()
    expect(updateCarts).not.toHaveBeenCalled()
  })
})
