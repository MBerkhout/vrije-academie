import { describe, expect, it } from "vitest"

import {
  buildProductMirrorDoc,
  mergeProductEditorialFromPublishedAndDraft,
  productMirrorDocChanged,
} from "./build-product-doc"

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

  it("preserves draft body when draft has pageBodyOwnedBySanity but published does not", () => {
    const draftBody = [{ _type: "textBlock", _key: "editor", content: [] }]
    const merged = mergeProductEditorialFromPublishedAndDraft(
      { pageBodyOwnedBySanity: false, body: [{ _type: "textBlock", _key: "sf", content: [] }] },
      { pageBodyOwnedBySanity: true, body: draftBody }
    )

    const doc = buildProductMirrorDoc(
      {
        id: "prod_1",
        handle: "course",
        title: "Course",
        description: "Salesforce description",
        imported_body_blocks: [{ _type: "textBlock", _key: "import", content: [] }],
      },
      merged
    )

    expect(doc.pageBodyOwnedBySanity).toBe(true)
    expect(doc.body).toEqual(draftBody)
  })

  it("uses draft body over published when a draft exists and ownership is on", () => {
    const draftBody = [{ _type: "textBlock", _key: "draft-only", content: [] }]
    const publishedBody = [{ _type: "textBlock", _key: "published", content: [] }]

    const merged = mergeProductEditorialFromPublishedAndDraft(
      { pageBodyOwnedBySanity: true, body: publishedBody },
      { pageBodyOwnedBySanity: true, body: draftBody }
    )

    const doc = buildProductMirrorDoc(
      { id: "prod_1", handle: "course", title: "Course", description: "New SF text" },
      merged
    )

    expect(doc.body).toEqual(draftBody)
  })

  it("merge treats ownership as on when only the draft has the checkmark", () => {
    const merged = mergeProductEditorialFromPublishedAndDraft(
      { pageBodyOwnedBySanity: false },
      { pageBodyOwnedBySanity: true, body: [] }
    )
    expect(merged?.pageBodyOwnedBySanity).toBe(true)
  })
})
