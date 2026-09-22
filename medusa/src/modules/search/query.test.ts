import { describe, expect, it } from "vitest"

import { buildSearchQuery, SEARCH_CORE_FIELDS, SEARCH_FUZZY_FIELDS } from "./query"

describe("buildSearchQuery", () => {
  it("requires every term and keeps fuzziness off autocomplete and body", () => {
    const body = buildSearchQuery("Colleges Iran", ["product"], 25)
    const must = (body.query as { bool: { must: Array<{ bool: { should: unknown[] } }> } }).bool
      .must[0].bool
    const [exact, fuzzy] = must.should as Array<{
      multi_match: {
        operator: string
        type: string
        fields: string[]
        fuzziness?: number
      }
    }>

    expect(exact.multi_match.operator).toBe("and")
    expect(exact.multi_match.type).toBe("cross_fields")
    expect(exact.multi_match.fields).toEqual([...SEARCH_CORE_FIELDS])
    expect(exact.multi_match.fields.some((f) => f.startsWith("body"))).toBe(false)
    expect(exact.multi_match).not.toHaveProperty("fuzziness")

    expect(fuzzy.multi_match.operator).toBe("and")
    expect(fuzzy.multi_match.fuzziness).toBe(1)
    expect(fuzzy.multi_match.fields).toEqual([...SEARCH_FUZZY_FIELDS])
    expect(fuzzy.multi_match.fields.some((f) => f.includes("autocomplete"))).toBe(false)
  })

  it("filters suggest queries to future products", () => {
    const body = buildSearchQuery("Iran", ["product", "category"], 32, {
      futureProductsOnly: true,
    })
    const filters = (body.query as { bool: { filter: unknown[] } }).bool.filter
    expect(filters).toEqual(
      expect.arrayContaining([
        { terms: { kind: ["product", "category"] } },
        expect.objectContaining({
          bool: expect.objectContaining({ minimum_should_match: 1 }),
        }),
      ])
    )
  })
})
