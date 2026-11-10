import { beforeEach, describe, expect, it, vi } from "vitest"

const run = vi.fn().mockResolvedValue({})
const updateProductsWorkflow = vi.fn(() => ({ run }))

vi.mock("@medusajs/medusa/core-flows", () => ({
  createProductsWorkflow: vi.fn(),
  createProductVariantsWorkflow: vi.fn(),
  linkProductsToSalesChannelWorkflow: vi.fn(),
  updateProductsWorkflow: (...args: unknown[]) => updateProductsWorkflow(...(args as [])),
  updateProductVariantsWorkflow: vi.fn(),
}))
vi.mock("../../links/product-properties", () => ({ default: {} }))
vi.mock("../../links/product-categories", () => ({ default: {} }))
vi.mock("../../links/product-event-group", () => ({ default: {} }))
vi.mock("../../links/variant-properties", () => ({ default: {} }))
vi.mock("../../links/product-docenten", () => ({ default: {} }))
vi.mock("../../links/variant-event-item", () => ({ default: {} }))
vi.mock("../../lib/store-listing-redis", () => ({ invalidateStoreListingCache: vi.fn() }))
vi.mock("../../lib/store-listing-invalidation", () => ({
  invalidateEventDetailForProductId: vi.fn(),
}))

import { ensureProductSessionOptionValues } from "./import-productgroup"

function makeContainer(opts: {
  optionRows?: unknown[]
  updateProductOptionValuesOnProduct?: ReturnType<typeof vi.fn>
}) {
  const graph = vi.fn().mockResolvedValue({
    data: [{ id: "prod_1", options: opts.optionRows ?? [] }],
  })
  const productModule = opts.updateProductOptionValuesOnProduct
    ? { updateProductOptionValuesOnProduct: opts.updateProductOptionValuesOnProduct }
    : {}
  const container = {
    resolve: (key: string) => (key === "query" ? { graph } : productModule),
  }
  return { container: container as never, graph }
}

const option = { id: "opt_1", title: "Sessie" }

describe("ensureProductSessionOptionValues", () => {
  beforeEach(() => {
    run.mockClear()
    updateProductsWorkflow.mockClear()
  })

  it("creates and links the option values on the product via the product module", async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const { container, graph } = makeContainer({
      optionRows: [option],
      updateProductOptionValuesOnProduct: update,
    })

    await ensureProductSessionOptionValues(container, "prod_1", "Sessie", ["A", "B", "B", "C"])

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "product", filters: { id: "prod_1" } })
    )
    expect(update).toHaveBeenCalledWith({
      product_id: "prod_1",
      product_option_id: "opt_1",
      add: [{ value: "A" }, { value: "B" }, { value: "C" }],
    })
    expect(updateProductsWorkflow).not.toHaveBeenCalled()
  })

  it("does nothing when no values are given or the option is missing", async () => {
    const update = vi.fn()
    const a = makeContainer({ optionRows: [option], updateProductOptionValuesOnProduct: update })
    await ensureProductSessionOptionValues(a.container, "prod_1", "Sessie", [])
    const b = makeContainer({ optionRows: [], updateProductOptionValuesOnProduct: update })
    await ensureProductSessionOptionValues(b.container, "prod_1", "Sessie", ["Z"])

    expect(update).not.toHaveBeenCalled()
    expect(updateProductsWorkflow).not.toHaveBeenCalled()
  })

  it("falls back to updateProductsWorkflow when the module has no updateProductOptionValuesOnProduct", async () => {
    const { container } = makeContainer({ optionRows: [option] })

    await ensureProductSessionOptionValues(container, "prod_1", "Sessie", ["B"])

    expect(updateProductsWorkflow).toHaveBeenCalledWith(container)
    expect(run).toHaveBeenCalledWith({
      input: {
        selector: { id: ["prod_1"] },
        update: { options: [{ title: "Sessie", values: ["B"] }] },
      },
    })
  })
})
