import { describe, expect, it } from "vitest"

import { hasInvisibleChars, stripInvisibleChars } from "./strip-invisible-chars"

describe("stripInvisibleChars", () => {
  it("removes zero-width characters that trim() keeps", () => {
    const dirty = "colleges-architectuur-in-40-gebouwen\u200B\u200C\u200D\uFEFF\u200B"
    expect(dirty.trim()).not.toBe("colleges-architectuur-in-40-gebouwen")
    expect(stripInvisibleChars(dirty)).toBe("colleges-architectuur-in-40-gebouwen")
  })

  it("keeps clean values and trims whitespace", () => {
    expect(stripInvisibleChars("  abc-def ")).toBe("abc-def")
  })
})

describe("hasInvisibleChars", () => {
  it("detects invisible characters", () => {
    expect(hasInvisibleChars("abc\u200B")).toBe(true)
    expect(hasInvisibleChars("abc")).toBe(false)
  })
})
