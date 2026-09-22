import { describe, expect, it } from "vitest"

import {
  countVathuisDeliveryFacet,
  injectVathuisDeliveryFacet,
  mergeVathuisIntoPlpList,
  taxonomyFacetsFromListingRows,
  withVathuisDeliveryType,
} from "./merge-vathuis-into-plp"

describe("taxonomyFacetsFromListingRows", () => {
  it("counts categories and teachers from embedded listing rows", () => {
    expect(
      taxonomyFacetsFromListingRows([
        {
          id: "va1",
          categories: [{ slug: "kunstgeschiedenis", label: "Kunstgeschiedenis" }],
          docenten: [{ slug: "ada", name: "Ada" }],
        },
        {
          id: "va2",
          categories: [
            { slug: "kunstgeschiedenis", label: "Kunstgeschiedenis" },
            { slug: "mode", label: "Mode" },
          ],
          docenten: [{ slug: "ada", name: "Ada" }],
        },
      ])
    ).toEqual({
      categories: [
        { slug: "kunstgeschiedenis", label: "Kunstgeschiedenis", count: 2 },
        { slug: "mode", label: "Mode", count: 1 },
      ],
      docenten: [{ slug: "ada", name: "Ada", count: 2 }],
    })
  })
})

describe("mergeVathuisIntoPlpList", () => {
  it("appends vathuis rows with pre_recorded delivery", () => {
    const merged = mergeVathuisIntoPlpList(
      [{ id: "live", delivery_types: ["online"] }],
      [{ id: "va", title: "College thuis" }]
    )
    expect(merged).toEqual([
      { id: "live", delivery_types: ["online"] },
      { id: "va", title: "College thuis", delivery_types: ["pre_recorded"] },
    ])
  })

  it("does not duplicate ids already on the PLP list", () => {
    expect(
      mergeVathuisIntoPlpList([{ id: "va" }], [{ id: "va", title: "College" }])
    ).toEqual([{ id: "va" }])
  })
})

describe("withVathuisDeliveryType", () => {
  it("keeps an existing pre_recorded type", () => {
    const row = { id: "va", delivery_types: ["pre_recorded"] }
    expect(withVathuisDeliveryType(row)).toBe(row)
  })
})

describe("countVathuisDeliveryFacet", () => {
  it("adds vathuis rows on top of a leftover pre_recorded PLP product", () => {
    expect(
      countVathuisDeliveryFacet(
        [{ id: "live", delivery_types: ["pre_recorded"] }],
        [
          { id: "va1", delivery_types: ["pre_recorded"] },
          { id: "va2", delivery_types: ["pre_recorded"] },
        ]
      )
    ).toBe(3)
  })

  it("does not double-count a vathuis id already on the PLP list", () => {
    expect(
      countVathuisDeliveryFacet(
        [{ id: "va1", delivery_types: ["pre_recorded"] }],
        [{ id: "va1", delivery_types: ["pre_recorded"] }]
      )
    ).toBe(1)
  })
})

describe("injectVathuisDeliveryFacet", () => {
  it("adds a pre_recorded bucket when missing", () => {
    expect(
      injectVathuisDeliveryFacet(
        { delivery_type: [{ slug: "online", count: 3 }] },
        12
      )
    ).toEqual({
      delivery_type: [
        { slug: "online", count: 3 },
        { slug: "pre_recorded", count: 12 },
      ],
    })
  })

  it("overwrites an existing pre_recorded count", () => {
    expect(
      injectVathuisDeliveryFacet(
        { delivery_type: [{ slug: "pre_recorded", count: 0 }] },
        8
      )
    ).toEqual({
      delivery_type: [{ slug: "pre_recorded", count: 8 }],
    })
  })
})
