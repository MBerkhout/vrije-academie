import { describe, expect, it } from "vitest"

import { firstWorkflowError } from "./workflow-failure"

describe("firstWorkflowError", () => {
  it("prefers thrownError", () => {
    const thrown = new Error("thrown")
    expect(firstWorkflowError({ thrownError: thrown, errors: [{ error: new Error("listed") }] })).toBe(
      thrown
    )
  })

  it("unwraps the first listed error", () => {
    const listed = new Error("listed")
    expect(firstWorkflowError({ errors: [{ error: listed }] })).toBe(listed)
  })

  it("stringifies non-Error listed values", () => {
    const err = firstWorkflowError({ thrownError: null, errors: [{ error: "nope" }] })
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("nope")
  })

  it("returns null when the run succeeded", () => {
    expect(firstWorkflowError({ errors: [] })).toBeNull()
    expect(firstWorkflowError(null)).toBeNull()
    expect(firstWorkflowError(undefined)).toBeNull()
  })
})
