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
  createProductOptionValues?: ReturnType<typeof vi.fn>
}) {
  const graph = vi.fn().mockResolvedValue({ data: opts.optionRows ?? [] })
  const productModule = opts.createProductOptionValues
    ? { createProductOptionValues: opts.createProductOptionValues }
    : {}
  const container = {
    resolve: (key: string) => (key === "query" ? { graph } : productModule),
  }
  return { container: container as never, graph }
}

const option = {
  id: "opt_1",
  title: "Sessie",
  values: [{ id: "v1", value: "A" }],
}

describe("ensureProductSessionOptionValues", () => {
  beforeEach(() => {
    run.mockClear()
    updateProductsWorkflow.mockClear()
  })

  it("creates only the missing option values via the product module", async () => {
    const create = vi.fn().mockResolvedValue([])
    const { container, graph } = makeContainer({
      optionRows: [option],
      createProductOptionValues: create,
    })

    await ensureProductSessionOptionValues(container, "prod_1", "Sessie", ["A", "B", "B", "C"])

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "product_option",
        filters: { product_id: "prod_1", title: "Sessie" },
      })
    )
    expect(create).toHaveBeenCalledWith([
      { option_id: "opt_1", value: "B" },
      { option_id: "opt_1", value: "C" },
    ])
    expect(updateProductsWorkflow).not.toHaveBeenCalled()
  })

  it("does nothing when all values already exist, no values are given or the option is missing", async () => {
    const create = vi.fn()
    const a = makeContainer({ optionRows: [option], createProductOptionValues: create })
    await ensureProductSessionOptionValues(a.container, "prod_1", "Sessie", ["A"])
    await ensureProductSessionOptionValues(a.container, "prod_1", "Sessie", [])
    const b = makeContainer({ optionRows: [], createProductOptionValues: create })
    await ensureProductSessionOptionValues(b.container, "prod_1", "Sessie", ["Z"])

    expect(create).not.toHaveBeenCalled()
    expect(updateProductsWorkflow).not.toHaveBeenCalled()
  })

  it("falls back to updateProductsWorkflow with the merged values when the module has no createProductOptionValues", async () => {
    const { container } = makeContainer({ optionRows: [option] })

    await ensureProductSessionOptionValues(container, "prod_1", "Sessie", ["B"])

    expect(updateProductsWorkflow).toHaveBeenCalledWith(container)
    expect(run).toHaveBeenCalledWith({
      input: {
        selector: { id: ["prod_1"] },
        update: { options: [{ title: "Sessie", values: ["A", "B"] }] },
      },
    })
  })
})
