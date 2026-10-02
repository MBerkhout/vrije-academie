import { describe, expect, it } from "vitest"

import {
  linkedOnlineParentSalesforceIds,
  pickCanonicalParentHandle,
  slaveMirrorSeoFields,
} from "./resolve-slave-canonical-parent"

describe("resolve-slave-canonical-parent", () => {
  it("linkedOnlineParentSalesforceIds normalizes parent id array", () => {
    expect(
      linkedOnlineParentSalesforceIds({
        salesforce_linked_online_parent_ids: [" a05X ", "", 42, "b05Y"],
      })
    ).toEqual(["a05X", "b05Y"])
    expect(linkedOnlineParentSalesforceIds({})).toEqual([])
  })

  it("pickCanonicalParentHandle chooses lowest handle among resolved parents", () => {
    const map = new Map([
      ["parent-a", "z-studiedag-kunst"],
      ["parent-b", "a-studiedag-kunst"],
    ])
    expect(pickCanonicalParentHandle(["parent-a", "parent-b"], map)).toBe("a-studiedag-kunst")
  })

  it("slaveMirrorSeoFields marks slaves and resolves canonical parent handle", () => {
    const parentMap = new Map([["pg1", "studiedag-kunst"]])
    expect(
      slaveMirrorSeoFields(
        {
          salesforce_is_linked_online_slave: true,
          salesforce_linked_online_parent_ids: ["pg1"],
        },
        parentMap
      )
    ).toEqual({
      is_linked_online_slave: true,
      canonical_parent_handle: "studiedag-kunst",
    })
    expect(slaveMirrorSeoFields({}, parentMap)).toEqual({
      is_linked_online_slave: false,
      canonical_parent_handle: null,
    })
  })
})
