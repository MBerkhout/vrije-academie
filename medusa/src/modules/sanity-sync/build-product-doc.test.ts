import { describe, expect, it } from "vitest"

import { buildProductMirrorDoc, productMirrorDocChanged } from "./build-product-doc"

describe("buildProductMirrorDoc", () => {
  it("includes linked-online slave SEO mirror fields", () => {
    const doc = buildProductMirrorDoc({
      id: "prod_1",
      handle: "online-slave",
      title: "ONLINE - Studiedag",
      is_linked_online_slave: true,
      canonical_parent_handle: "studiedag-kunst",
    })

    expect(doc.isLinkedOnlineSlave).toBe(true)
    expect(doc.canonicalParentHandle).toBe("studiedag-kunst")
  })

  it("productMirrorDocChanged detects slave field updates", () => {
    const target = buildProductMirrorDoc({
      id: "prod_1",
      handle: "online-slave",
      title: "ONLINE - Studiedag",
      is_linked_online_slave: true,
      canonical_parent_handle: "studiedag-kunst",
    })

    expect(
      productMirrorDocChanged(target, {
        ...target,
        isLinkedOnlineSlave: false,
      })
    ).toBe(true)

    expect(productMirrorDocChanged(target, target)).toBe(false)
  })
})
