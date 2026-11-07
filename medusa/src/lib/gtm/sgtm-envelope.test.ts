import { describe, expect, it } from "vitest"

import { toStapeDataClientBody } from "./sgtm-envelope"

describe("toStapeDataClientBody", () => {
  it("renames event to event_name", () => {
    expect(
      toStapeDataClientBody({
        event: "purchase",
        transaction_id: "VA-1",
        value: 10,
      })
    ).toEqual({
      event_name: "purchase",
      transaction_id: "VA-1",
      value: 10,
    })
  })
})
