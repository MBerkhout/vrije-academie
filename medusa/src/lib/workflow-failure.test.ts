import { describe, expect, it } from "vitest"

import { firstWorkflowError } from "./workflow-failure"

describe("firstWorkflowError", () => {
  it("prefers thrownError", () => {
    const thrown = new Error("thrown")
    expect(firstWorkflowError(thrown, [{ error: new Error("listed") }])).toBe(thrown)
  })

  it("unwraps the first listed error", () => {
    const listed = new Error("listed")
    expect(firstWorkflowError(undefined, [{ error: listed }])).toBe(listed)
  })

  it("stringifies non-Error listed values", () => {
    const err = firstWorkflowError(null, [{ error: "nope" }])
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("nope")
  })

  it("returns null when the run succeeded", () => {
    expect(firstWorkflowError(undefined, [])).toBeNull()
    expect(firstWorkflowError(null, null)).toBeNull()
  })
})
