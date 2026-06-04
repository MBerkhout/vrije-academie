import { describe, expect, it } from "vitest"
import { ctaUrlFormatMessage, isValidCtaUrl } from "../ctaUrl"

describe("isValidCtaUrl", () => {
  it("accepts relative site paths", () => {
    expect(isValidCtaUrl("/ons-aanbod")).toBe(true)
    expect(isValidCtaUrl("/ons-aanbod?record_type=collegereeks")).toBe(true)
    expect(isValidCtaUrl("/ons-aanbod/workshop")).toBe(true)
  })

  it("accepts absolute http(s) and mailto URLs", () => {
    expect(isValidCtaUrl("https://example.com/path")).toBe(true)
    expect(isValidCtaUrl("http://example.com")).toBe(true)
    expect(isValidCtaUrl("mailto:info@example.com")).toBe(true)
  })

  it("rejects paths without leading slash and invalid values", () => {
    expect(isValidCtaUrl("ons-aanbod")).toBe(false)
    expect(isValidCtaUrl("")).toBe(false)
    expect(isValidCtaUrl("javascript:alert(1)")).toBe(false)
  })
})

describe("ctaUrlFormatMessage", () => {
  it("allows empty values", () => {
    expect(ctaUrlFormatMessage("")).toBe(true)
    expect(ctaUrlFormatMessage(undefined)).toBe(true)
  })

  it("returns an error for invalid URLs", () => {
    expect(typeof ctaUrlFormatMessage("not-a-url")).toBe("string")
  })
})
