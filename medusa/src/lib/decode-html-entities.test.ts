import { describe, expect, it } from "vitest"

import { decodeHtmlEntities } from "./decode-html-entities"
import { stripHtmlToPlainText } from "../modules/salesforce-sync/mappings/productgroup"

describe("decodeHtmlEntities", () => {
  it("turns numeric and named apostrophes into a straight quote", () => {
    expect(decodeHtmlEntities("z&#39;n")).toBe("z'n")
    expect(decodeHtmlEntities("z&#x27;n")).toBe("z'n")
    expect(decodeHtmlEntities("artist&apos;s")).toBe("artist's")
  })

  it("decodes an entity that was wrapped in &amp;", () => {
    expect(decodeHtmlEntities("&amp;#39;")).toBe("'")
  })
})

describe("stripHtmlToPlainText", () => {
  it("decodes apostrophes left in Salesforce teacher bios", () => {
    expect(
      stripHtmlToPlainText(
        "Ook kent Krzysztof Museum Catharijneconvent en het Rijksmuseum op z&#39;n duimpje."
      )
    ).toBe("Ook kent Krzysztof Museum Catharijneconvent en het Rijksmuseum op z'n duimpje.")
  })

  it("still strips tags and collapses whitespace", () => {
    expect(stripHtmlToPlainText("<p>Hello&nbsp;world</p>")).toBe("Hello world")
    expect(stripHtmlToPlainText("Ren&eacute; &amp; co")).toBe("René & co")
  })
})
