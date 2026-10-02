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

  it("keeps strong and em marks when Salesforce adds inline attributes", () => {
    expect(
      parseInlineHtmlToSpans(
        '<strong style="color: rgb(247, 11, 11);">NIEUW!</strong> Nu <em class="x">ook</em> online.'
      )
    ).toEqual({
      spans: [
        { text: "NIEUW!", marks: ["strong"] },
        { text: " Nu ", marks: [] },
        { text: "ook", marks: ["em"] },
        { text: " online.", marks: [] },
      ],
      markDefs: [],
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
  it("uses the section title as the heading of the first description paragraph", () => {
    const html =
      "<p>Ben je weleens binnen geweest?</p>" +
      "<p><strong>Sporen uit de 17e eeuw</strong></p><p>Vooral sporen uit de 17e eeuw.</p>"

    const blocks = descriptionHtmlToPdpBody(html, { sectionTitle: "Het stadhuis van Amsterdam" })

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ title: "Het stadhuis van Amsterdam", titleSize: "h2" })
    expect((blocks[0]?.content as Array<{ children: Array<{ text: string }> }>)[0]?.children[0]?.text).toBe(
      "Ben je weleens binnen geweest?"
    )
    expect(blocks[0]).not.toHaveProperty("subtitle")
    expect(blocks[1]).toMatchObject({ title: "Sporen uit de 17e eeuw", titleSize: "h2" })
  })

  it("keeps the section title as its own heading when the description opens with a heading", () => {
    const html = "<p><strong>Eigen kop</strong></p><p>Tekst.</p>"

    const blocks = descriptionHtmlToPdpBody(html, { sectionTitle: "Subtitel uit Salesforce" })

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ title: "Subtitel uit Salesforce", content: [] })
    expect(blocks[1]).toMatchObject({ title: "Eigen kop" })
  })

  it("does not create a block for a section title without a description", () => {
    expect(descriptionHtmlToPdpBody(null, { sectionTitle: "Alleen een kop" })).toEqual([])
  })

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
    expect(blocks[0]).toMatchObject({ subtitle: "Quote title", content: [] })
    expect(blocks[1]).not.toHaveProperty("title")
    expect((blocks[2]?.content as Array<{ listItem?: string }>)?.[0]?.listItem).toBe("bullet")
  })

  // Rondleiding Paleis op de Dam: trigger = catch line, Subtitle = heading of the first paragraph.
  it("maps trigger to a lead subtitle and Subtitle to the first section heading", () => {
    const blocks = buildSalesforceImportedBody({
      salesforce_web_trigger: "Kom mee en ontdek het mooiste stadhuis van de Gouden Eeuw!",
      salesforce_subtitle: "Het stadhuis van Amsterdam",
      salesforce_description_html:
        "<p>Ben je weleens binnen geweest in dat imposante gebouw op de Dam?</p>" +
        "<p><strong>Sporen uit de 17e eeuw</strong></p><p>Vooral sporen uit de 17e eeuw.</p>",
    })

    expect(blocks).toHaveLength(3)
    expect(blocks[0]).toMatchObject({
      subtitle: "Kom mee en ontdek het mooiste stadhuis van de Gouden Eeuw!",
      content: [],
    })
    expect(blocks[0]).not.toHaveProperty("title")
    expect(blocks[1]).toMatchObject({ title: "Het stadhuis van Amsterdam", titleSize: "h2" })
    expect(blocks[2]).toMatchObject({ title: "Sporen uit de 17e eeuw", titleSize: "h2" })
  })

  // Colleges Introductie kunstgeschiedenis: Subtitle repeats the trigger (minus the period).
  it("shows a Subtitle that repeats the trigger only once", () => {
    const blocks = buildSalesforceImportedBody({
      salesforce_web_trigger: "2500 jaar westerse kunstgeschiedenis in vogelvlucht.",
      salesforce_subtitle: "2500 jaar westerse kunstgeschiedenis in vogelvlucht",
      salesforce_description_html: "<p>Waar begin je als je meer wil weten over kunst?</p>",
    })

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({
      subtitle: "2500 jaar westerse kunstgeschiedenis in vogelvlucht.",
    })
    expect(blocks[1]).not.toHaveProperty("title")
  })

  it("does not turn a lone Subtitle into body content", () => {
    expect(buildSalesforceImportedBody({ salesforce_subtitle: "Korte intro." })).toEqual([])
  })

  // VA Thuis PDP lifts the first textBlock.subtitle under the H1 (`extractPdpSubtitle`).
  it("keeps the Subtitle as a subtitle block for VA Thuis and the trigger as plain text", () => {
    const blocks = buildSalesforceImportedBody({
      vathuis: { purchase_mode: "bundle_only" },
      salesforce_web_trigger: "Quote title",
      salesforce_subtitle: "Een serie over kunst",
      salesforce_description_html: "<p>Een serie over kunst.</p><p>Echte inhoud.</p>",
    })

    expect(blocks).toHaveLength(3)
    expect(blocks[0]).not.toHaveProperty("subtitle")
    expect((blocks[0]?.content as Array<{ children: Array<{ text: string }> }>)[0]?.children[0]?.text).toBe(
      "Quote title"
    )
    expect(blocks[1]).toMatchObject({ subtitle: "Een serie over kunst", content: [] })
    expect(blocks[2]).not.toHaveProperty("title")
    expect((blocks[2]?.content as Array<{ children: Array<{ text: string }> }>)[0]?.children[0]?.text).toBe(
      "Echte inhoud."
    )
  })

  it("keeps a VA Thuis Subtitle even without a description", () => {
    const blocks = buildSalesforceImportedBody({
      vathuis: { purchase_mode: "bundle_only" },
      salesforce_subtitle: "Alleen een subtitel",
    })

    expect(blocks).toEqual([expect.objectContaining({ subtitle: "Alleen een subtitel", content: [] })])
  })
})
