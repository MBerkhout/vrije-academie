/**
 * Builds PDP `body` blocks (textBlock per paragraph) from Medusa product.description.
 * Handles plain text and common HTML fragments.
 */

const key = () => Math.random().toString(36).slice(2, 11)

/** Decode a few common HTML entities (best-effort). */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
}

/**
 * Split product description into paragraph strings for one textBlock each.
 */
export function splitDescriptionToParagraphs(raw: string | null | undefined): string[] {
  if (raw == null || !String(raw).trim()) return []

  let t = String(raw).trim()

  // Normalize common HTML to newlines, then strip tags
  t = t.replace(/<br\s*\/?>/gi, "\n")
  t = t.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
  t = t.replace(/<\/?p[^>]*>/gi, "\n")
  t = t.replace(/<\/(div|h[1-6]|li|blockquote)[^>]*>/gi, "\n")
  t = t.replace(/<[^>]+>/g, "")
  t = decodeHtmlEntities(t)

  const parts = t
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  return parts.length ? parts : [t.replace(/\s+/g, " ").trim()].filter(Boolean)
}

function portableTextParagraph(text: string): Record<string, unknown> {
  return {
    _type: "block",
    _key: key(),
    style: "normal",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: key(),
        text,
        marks: [],
      },
    ],
  }
}

/**
 * One Sanity `textBlock` document per paragraph (matches PDP surface blocks).
 */
export function descriptionToPdpBody(description: string | null | undefined): Record<string, unknown>[] {
  const paragraphs = splitDescriptionToParagraphs(description)
  return paragraphs.map((text) => ({
    _type: "textBlock",
    _key: key(),
    content: [portableTextParagraph(text)],
    titleSize: "h2",
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
  }))
}
