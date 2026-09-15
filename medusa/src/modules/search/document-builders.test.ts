import { describe, expect, it } from "vitest"

import { buildProductSearchDoc } from "./document-builders"

describe("buildProductSearchDoc", () => {
  it("links VA Thuis products to /va-thuis and treats them as searchable", () => {
    const doc = buildProductSearchDoc({
      id: "prod_1",
      title: "Leukste VAthuis lezing3",
      handle: "leukste-vathuis-lezing3",
      record_type: "vathuis",
      purchase_mode: "bundle_only",
    })

    expect(doc).toMatchObject({
      id: "product-prod_1",
      title: "Leukste VAthuis lezing3",
      subtitle: "VA Thuis",
      url: "/va-thuis/leukste-vathuis-lezing3",
      has_future_activity: true,
    })
  })

  it("keeps live events on Ons aanbod", () => {
    const doc = buildProductSearchDoc({
      id: "prod_2",
      title: "College Amsterdam",
      handle: "college-amsterdam",
      record_type: "lezing",
      variants: [{ event_item: { start_at: new Date(Date.now() + 86_400_000).toISOString() } }],
    })

    expect(doc?.url).toBe("/ons-aanbod/college-amsterdam")
    expect(doc?.subtitle).toBe("lezing")
  })
})
