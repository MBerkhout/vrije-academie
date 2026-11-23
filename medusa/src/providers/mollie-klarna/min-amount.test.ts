import { describe, expect, it } from "vitest"

import { isBelowKlarnaMinimum, parseKlarnaMinAmount } from "./min-amount"

describe("isBelowKlarnaMinimum", () => {
  it("is true below the minimum", () => {
    expect(isBelowKlarnaMinimum(99.99, 100)).toBe(true)
  })
  it("is false at and above the minimum", () => {
    expect(isBelowKlarnaMinimum(100, 100)).toBe(false)
    expect(isBelowKlarnaMinimum("150.00", 100)).toBe(false)
  })
  it("is disabled when minimum is 0 or undefined", () => {
    expect(isBelowKlarnaMinimum(1, 0)).toBe(false)
    expect(isBelowKlarnaMinimum(1, undefined)).toBe(false)
  })
})

describe("parseKlarnaMinAmount", () => {
  it("defaults to 100", () => {
    expect(parseKlarnaMinAmount(undefined)).toBe(100)
    expect(parseKlarnaMinAmount("abc")).toBe(100)
    expect(parseKlarnaMinAmount("-5")).toBe(100)
  })
  it("parses values including 0 and comma decimals", () => {
    expect(parseKlarnaMinAmount("0")).toBe(0)
    expect(parseKlarnaMinAmount("75,50")).toBe(75.5)
  })
})
