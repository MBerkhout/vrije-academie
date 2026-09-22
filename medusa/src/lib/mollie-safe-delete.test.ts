import { describe, expect, it, vi } from "vitest"

import {
  safeCancelMolliePayment,
  wrapMollieDeleteNeverThrow,
} from "./mollie-safe-delete"

function client(overrides?: {
  get?: () => Promise<{ id?: string; status?: string }>
  cancel?: () => Promise<unknown>
}) {
  return {
    payments: {
      get: overrides?.get ?? vi.fn(),
      cancel: overrides?.cancel ?? vi.fn(),
    },
  }
}

describe("safeCancelMolliePayment", () => {
  it("returns stored data when there is no Mollie payment id", async () => {
    const c = client()
    const result = await safeCancelMolliePayment(c, { foo: 1 })
    expect(result).toEqual({ data: { foo: 1 } })
    expect(c.payments.get).not.toHaveBeenCalled()
  })

  it("does not throw when GET fails", async () => {
    const warn = vi.fn()
    const c = client({
      get: async () => {
        throw new Error("Not Found")
      },
    })
    const result = await safeCancelMolliePayment(c, { id: "tr_abc" }, { warn })
    expect(result.data.id).toBe("tr_abc")
    expect(warn).toHaveBeenCalled()
  })

  it("skips cancel for paid and canceled payments", async () => {
    const c = client({
      get: async () => ({ id: "tr_paid", status: "paid" }),
    })
    const result = await safeCancelMolliePayment(c, { id: "tr_paid" })
    expect(result.data.status).toBe("paid")
    expect(c.payments.cancel).not.toHaveBeenCalled()
  })

  it("cancels an open payment", async () => {
    const c = client({
      get: async () => ({ id: "tr_open", status: "open" }),
      cancel: async () => ({ id: "tr_open", status: "canceled" }),
    })
    const result = await safeCancelMolliePayment(c, { id: "tr_open" })
    expect(result.data.status).toBe("canceled")
    expect(c.payments.cancel).toHaveBeenCalledWith("tr_open")
  })

  it("does not throw when cancel fails", async () => {
    const warn = vi.fn()
    const c = client({
      get: async () => ({ id: "tr_open", status: "open" }),
      cancel: async () => {
        throw new Error("cannot be cancelled")
      },
    })
    const result = await safeCancelMolliePayment(c, { id: "tr_open" }, { warn })
    expect(result.data.id).toBe("tr_open")
    expect(warn).toHaveBeenCalled()
  })
})

describe("wrapMollieDeleteNeverThrow", () => {
  it("swallows throws from missing session data", async () => {
    const orig = async (input: { data?: unknown }) => {
      const { id } = input.data as { id: string }
      return { data: { id } }
    }
    const wrapped = wrapMollieDeleteNeverThrow(orig, "cancelPayment")
    const ctx = { logger_: { warn: vi.fn() } }
    const result = await wrapped.call(ctx, { data: undefined })
    expect(result).toEqual({ data: {} })
    expect(ctx.logger_.warn).toHaveBeenCalled()
  })
})
