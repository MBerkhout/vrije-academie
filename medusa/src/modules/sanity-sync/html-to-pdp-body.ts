/**
 * Converts Salesforce HTML fragments into Sanity PDP `textBlock` entries.
 * Handles description sections (`<p><strong>heading</strong></p>` + body) and
 * footer lists (`<ul><li>…</li></ul>` with bold subheadings).
 */

const key = () => Math.random().toString(36).slice(2, 11)

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
}

function stripTags(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
}

/** Compare two Salesforce text fields; ignores case, markup, and trailing sentence punctuation. */
function normalizeComparableText(s: string): string {
  return stripTags(s)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…]+$/u, "")
    .trim()
    .toLowerCase()
}

function textBlock(
  content: Record<string, unknown>[],
  options?: { title?: string | null; subtitle?: string | null }
): Record<string, unknown> {
  return {
    _type: "textBlock",
    _key: key(),
    ...(options?.title ? { title: options.title } : {}),
    ...(options?.subtitle ? { subtitle: options.subtitle } : {}),
    content,
    titleSize: options?.title ? "h2" : undefined,
    titleAlignment: "left",
    width: "wide",
    layout: {
      marginTop: "24",
      marginBottom: "24",
      paddingTop: "0",
      paddingBottom: "0",
      width: "full",
      backgroundColor: "none",
    },
  }
}

function mergeAdjacentSpans(
  spans: Array<{ text: string; marks: string[] }>
): Array<{ text: string; marks: string[] }> {
  const merged: Array<{ text: string; marks: string[] }> = []
  for (const span of spans) {
    if (!span.text) continue
    const prev = merged[merged.length - 1]
    if (prev && prev.marks.join() === span.marks.join()) {
      prev.text += span.text
    } else {
      merged.push({ text: span.text, marks: [...span.marks] })
    }
  }
  return merged
}

const LINK_OPEN = "\u0000L:"
const LINK_CLOSE = "\u0000/L\u0000"

/** Normalize inline HTML before tokenizing strong/em marks. */
function preprocessInlineHtml(html: string): string {
  let s = html.replace(/<br\s*\/?>/gi, "\n")
  s = s.replace(/<span[^>]*>/gi, "").replace(/<\/span>/gi, "")
  s = s.replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, (_m, href: string) => `${LINK_OPEN}${href}\u0000`)
  s = s.replace(/<\/a>/gi, LINK_CLOSE)
  s = s.replace(/<(?!\/?(?:strong|em)\b)[^>]+>/gi, "")
  return s
}

export type ParsedInlineSpans = {
  spans: Array<{ text: string; marks: string[] }>
  markDefs: Array<{ _key: string; _type: "link"; href: string }>
}

/** Parse inline HTML (`<strong>`, `<em>`, `<a>`, `<span>`, `<br>`) into portable-text spans. */
export function parseInlineHtmlToSpans(html: string): ParsedInlineSpans {
  const normalized = preprocessInlineHtml(html)
  const spans: Array<{ text: string; marks: string[] }> = []
  const markDefs: Array<{ _key: string; _type: "link"; href: string }> = []
  const marks: string[] = []
  const openLinkMarks: string[] = []
  const tokenRe =
    /<(\/?)(strong|em)\b[^>]*>|\u0000L:([^\u0000]+)\u0000|\u0000\/L\u0000|([^\u0000<]+)/gi
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(normalized)) !== null) {
    const tag = match[2]?.toLowerCase()
    if (tag) {
      if (match[1]) {
        const idx = marks.lastIndexOf(tag)
        if (idx >= 0) marks.splice(idx, 1)
      } else {
        marks.push(tag)
      }
    } else if (match[3]) {
      const markKey = key()
      markDefs.push({ _key: markKey, _type: "link", href: decodeHtmlEntities(match[3]) })
      marks.push(markKey)
      openLinkMarks.push(markKey)
    } else if (match[0] === LINK_CLOSE) {
      const markKey = openLinkMarks.pop()
      if (markKey) {
        const idx = marks.lastIndexOf(markKey)
        if (idx >= 0) marks.splice(idx, 1)
      }
    } else if (match[4]) {
      const text = decodeHtmlEntities(match[4])
      if (text) spans.push({ text, marks: [...marks] })
    }
  }

  return { spans: mergeAdjacentSpans(spans), markDefs }
}

function portableTextBlock(
  inlineHtml: string,
  options?: { listItem?: "bullet"; allStrong?: boolean }
): Record<string, unknown> {
  let { spans, markDefs } = parseInlineHtmlToSpans(inlineHtml)
  if (options?.allStrong) {
    spans = spans.map((s) => ({
      text: s.text,
      marks: s.marks.includes("strong") ? s.marks : [...s.marks, "strong"],
    }))
  }

  return {
    _type: "block",
    _key: key(),
    style: "normal",
    markDefs,
    ...(options?.listItem ? { listItem: options.listItem, level: 1 } : {}),
    children: spans.map((s) => ({
      _type: "span",
      _key: key(),
      text: s.text,
      marks: s.marks,
    })),
  }
}

function extractParagraphInners(html: string): string[] {
  const parts: string[] = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    parts.push(match[1].trim())
  }
  return parts
}

function extractListItemInners(html: string): string[] {
  const parts: string[] = []
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    parts.push(match[1].trim())
  }
  return parts
}

function isStrongOnlyParagraph(inner: string): string | null {
  const match = inner.trim().match(/^<strong[^>]*>([\s\S]*)<\/strong>$/i)
  return match ? stripTags(match[1]) : null
}

/**
 * Quote / web trigger (`Productgroup_Web_Trigger__c`) — the catch line under the PDP title
 * (e.g. “Beleef de kunst van Matisse van dichtbij.”).
 *
 * Default: a heading-less `textBlock` with `subtitle`, which the storefront renders as a large
 * lead line. VA Thuis passes `asLead: false` (plain text block) because its PDP takes the
 * subtitle from `Productgroup_Subtitle__c` instead (see `extractPdpSubtitle` in the storefront).
 */
export function quoteHtmlToPdpBody(
  html: string | null | undefined,
  options?: { asLead?: boolean }
): Record<string, unknown>[] {
  const text = stripTags(html ?? "")
  if (!text) return []
  if (options?.asLead === false) return [textBlock([portableTextBlock(text)])]
  return [textBlock([], { subtitle: text })]
}

/**
 * Productgroup description: paragraphs plus `<strong>` headings mapped to `textBlock.title`.
 *
 * `Productgroup_Subtitle__c` is mapped one of two ways:
 * - `sectionTitle` (regular PDPs, e.g. “Het stadhuis van Amsterdam”): heading of the first
 *   description paragraph, same as a `<strong>` section heading. When the description already
 *   opens with its own heading, the section title is kept as a separate heading-only block.
 * - `leadSubtitle` (VA Thuis): a leading subtitle-only block that the storefront lifts under the
 *   H1; an opening `<p>` repeating it is dropped.
 */
export function descriptionHtmlToPdpBody(
  html: string | null | undefined,
  options?: { sectionTitle?: string | null; leadSubtitle?: string | null }
): Record<string, unknown>[] {
  const sectionTitle = options?.sectionTitle?.trim() || null
  const leadSubtitle = options?.leadSubtitle?.trim() || null
  const lead = leadSubtitle ? [textBlock([], { subtitle: leadSubtitle })] : []

  if (!html?.trim()) return lead

  const trimmed = html.trim()

  const withSectionTitle = (blocks: Record<string, unknown>[]): Record<string, unknown>[] => {
    if (!sectionTitle || !blocks.length) return blocks
    const [first, ...rest] = blocks
    if (first && !first.title) {
      return [{ ...first, title: sectionTitle, titleSize: "h2" }, ...rest]
    }
    return [textBlock([], { title: sectionTitle }), ...blocks]
  }

  const repeatsLeadSubtitle = (text: string): boolean =>
    Boolean(leadSubtitle) && normalizeComparableText(text) === normalizeComparableText(leadSubtitle!)

  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    if (repeatsLeadSubtitle(trimmed)) return lead
    return [...lead, ...withSectionTitle([textBlock([portableTextBlock(trimmed)])])]
  }

  let paragraphs = extractParagraphInners(trimmed)
  if (!paragraphs.length) {
    const text = stripTags(trimmed)
    if (!text || repeatsLeadSubtitle(text)) return lead
    return [...lead, ...withSectionTitle([textBlock([portableTextBlock(text)])])]
  }

  if (repeatsLeadSubtitle(paragraphs[0]!)) paragraphs = paragraphs.slice(1)

  const blocks: Record<string, unknown>[] = []
  for (let i = 0; i < paragraphs.length; ) {
    const heading = isStrongOnlyParagraph(paragraphs[i]!)
    if (heading && i + 1 < paragraphs.length && !isStrongOnlyParagraph(paragraphs[i + 1]!)) {
      blocks.push(
        textBlock([portableTextBlock(paragraphs[i + 1]!)], { title: heading })
      )
      i += 2
      continue
    }

    blocks.push(textBlock([portableTextBlock(paragraphs[i]!)]))
    i += 1
  }

  return [...lead, ...withSectionTitle(blocks)]
}

/**
 * Web body footer: bullet lists and bold subheadings in one textBlock.
 */
export function webBodyHtmlToPdpBody(html: string | null | undefined): Record<string, unknown>[] {
  if (!html?.trim()) return []

  const content: Record<string, unknown>[] = []
  const tokenRe = /(<ul[^>]*>[\s\S]*?<\/ul>)|(<p[^>]*>[\s\S]*?<\/p>)/gi
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(html)) !== null) {
    if (match[1]) {
      for (const item of extractListItemInners(match[1])) {
        content.push(portableTextBlock(item, { listItem: "bullet" }))
      }
      continue
    }

    if (match[2]) {
      const innerMatch = match[2].match(/^<p[^>]*>([\s\S]*?)<\/p>$/i)
      const inner = innerMatch?.[1]?.trim() ?? ""
      if (!inner) continue

      const heading = isStrongOnlyParagraph(inner)
      content.push(
        portableTextBlock(inner, heading ? { allStrong: true } : undefined)
      )
    }
  }

  if (!content.length) {
    const text = stripTags(html)
    return text ? [textBlock([portableTextBlock(text)])] : []
  }

  return [textBlock(content)]
}

/** VA Thuis bundle products carry `metadata.vathuis.purchase_mode = "bundle_only"`. */
function isVathuisBundle(metadata: Record<string, unknown>): boolean {
  const vathuis = metadata.vathuis
  return (
    typeof vathuis === "object" &&
    vathuis !== null &&
    (vathuis as Record<string, unknown>).purchase_mode === "bundle_only"
  )
}

/** Build ordered PDP body blocks from Salesforce product metadata. */
export function buildSalesforceImportedBody(
  metadata: Record<string, unknown>,
  fallbackDescription?: string | null
): Record<string, unknown>[] {
  const trigger =
    (typeof metadata.salesforce_web_trigger === "string" && metadata.salesforce_web_trigger) ||
    null
  const descriptionHtml =
    (typeof metadata.salesforce_description_html === "string" &&
      metadata.salesforce_description_html) ||
    fallbackDescription ||
    null
  const webBody =
    (typeof metadata.salesforce_web_body === "string" && metadata.salesforce_web_body) || null
  const subtitle =
    (typeof metadata.salesforce_subtitle === "string" && metadata.salesforce_subtitle.trim()) ||
    null

  if (!trigger && !descriptionHtml && !webBody && !(isVathuisBundle(metadata) && subtitle)) {
    return []
  }

  // VA Thuis shows the Subtitle under the H1 (storefront `extractPdpSubtitle`); keep that shape.
  if (isVathuisBundle(metadata)) {
    return [
      ...quoteHtmlToPdpBody(trigger, { asLead: false }),
      ...descriptionHtmlToPdpBody(descriptionHtml, { leadSubtitle: subtitle }),
      ...webBodyHtmlToPdpBody(webBody),
    ]
  }

  // Regular PDP: the trigger is the lead line; the Subtitle heads the first description paragraph.
  // Some groups repeat the trigger in the Subtitle field; show that line once.
  const sectionTitle =
    subtitle && trigger && normalizeComparableText(subtitle) === normalizeComparableText(trigger)
      ? null
      : subtitle

  return [
    ...quoteHtmlToPdpBody(trigger),
    ...descriptionHtmlToPdpBody(descriptionHtml, { sectionTitle }),
    ...webBodyHtmlToPdpBody(webBody),
  ]
}
