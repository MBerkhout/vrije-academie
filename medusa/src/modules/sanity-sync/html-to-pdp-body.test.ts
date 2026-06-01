import { describe, expect, it } from "vitest"

import {
  buildSalesforceImportedBody,
  descriptionHtmlToPdpBody,
  parseInlineHtmlToSpans,
  webBodyHtmlToPdpBody,
} from "./html-to-pdp-body"

describe("parseInlineHtmlToSpans", () => {
  it("parses strong and em marks", () => {
    expect(parseInlineHtmlToSpans("Hello <strong>world</strong> and <em>more</em>")).toEqual({
      spans: [
        { text: "Hello ", marks: [] },
        { text: "world", marks: ["strong"] },
        { text: " and ", marks: [] },
        { text: "more", marks: ["em"] },
      ],
      markDefs: [],
    })
  })

  it("parses anchor tags as portable-text links without mangling markup", () => {
    const { spans, markDefs } = parseInlineHtmlToSpans(
      'Het dagprogramma vind je <a href="https://example.com/doc.pdf" target="_blank">hier.</a>'
    )

    expect(spans).toEqual([
      { text: "Het dagprogramma vind je ", marks: [] },
      { text: "hier.", marks: [markDefs[0]?._key] },
    ])
    expect(markDefs).toHaveLength(1)
    expect(markDefs[0]).toMatchObject({
      _type: "link",
      href: "https://example.com/doc.pdf",
    })
  })

  it("strips span tags but keeps inner text", () => {
    expect(
      parseInlineHtmlToSpans(
        '<span style="background-color: rgb(255, 255, 255);">Reissom </span>vanaf: € 5845,-'
      )
    ).toEqual({
      spans: [{ text: "Reissom vanaf: € 5845,-", marks: [] }],
      markDefs: [],
    })
  })
})

describe("descriptionHtmlToPdpBody", () => {
  it("maps strong-only paragraphs to textBlock titles", () => {
    const html =
      "<p>Intro paragraph.</p><p><strong>Section one</strong></p><p>Body one.</p><p><strong>Section two</strong></p><p>Body two.</p>"

    const blocks = descriptionHtmlToPdpBody(html)
    expect(blocks).toHaveLength(3)
    expect(blocks[0]).not.toHaveProperty("title")
    expect(blocks[1]).toMatchObject({ title: "Section one", titleSize: "h2" })
    expect(blocks[2]).toMatchObject({ title: "Section two", titleSize: "h2" })
  })
})

describe("webBodyHtmlToPdpBody", () => {
  it("preserves links and span styling text in Iceland-style footer HTML", () => {
    const html =
      '<p>Het dagprogramma vind je <a href="https://example.com/doc.pdf" target="_blank">hier.</a></p>' +
      "<p><strong>REISGEGEVENS</strong></p>" +
      '<ul><li>Reisdata: 14 t/m 23 juni 2026</li>' +
      '<li><span style="background-color: rgb(255, 255, 255);">Reissom </span>vanaf: € 5845,-</li></ul>'

    const blocks = webBodyHtmlToPdpBody(html)
    const content = blocks[0]?.content as Array<{
      children?: Array<{ text?: string; marks?: string[] }>
      markDefs?: Array<{ _type?: string; href?: string }>
    }>

    expect(content?.[0]?.children?.[0]?.text).toBe("Het dagprogramma vind je ")
    expect(content?.[0]?.children?.[1]?.text).toBe("hier.")
    expect(content?.[0]?.markDefs?.[0]).toMatchObject({
      _type: "link",
      href: "https://example.com/doc.pdf",
    })
    expect(content?.[3]?.children?.[0]?.text).toBe("Reissom vanaf: € 5845,-")
  })

  it("creates one textBlock with bullet list items and bold subheadings", () => {
    const html =
      "<ul><li>First bullet.</li></ul><p><strong>Question?</strong></p><ul><li>Answer one.</li><li>Answer two.</li></ul>"

    const blocks = webBodyHtmlToPdpBody(html)
    expect(blocks).toHaveLength(1)
    const content = blocks[0]?.content as Array<Record<string, unknown>>
    expect(content).toHaveLength(4)
    expect(content[0]).toMatchObject({ listItem: "bullet" })
    expect(content[1]).toMatchObject({
      children: [{ marks: ["strong"], text: "Question?" }],
    })
    expect(content[2]).toMatchObject({ listItem: "bullet" })
  })
})

describe("buildSalesforceImportedBody", () => {
  it("orders trigger, description, and web body", () => {
    const blocks = buildSalesforceImportedBody({
      salesforce_web_trigger: "Quote title",
      salesforce_description_html: "<p>Intro</p>",
      salesforce_web_body: "<ul><li>Footer</li></ul>",
    })

    expect(blocks).toHaveLength(3)
    expect((blocks[0]?.content as Array<{ children: Array<{ text: string }> }>)?.[0]?.children?.[0]?.text).toBe(
      "Quote title"
    )
    expect(blocks[1]).not.toHaveProperty("title")
    expect((blocks[2]?.content as Array<{ listItem?: string }>)?.[0]?.listItem).toBe("bullet")
  })
})
