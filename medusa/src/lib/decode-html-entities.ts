const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  euml: "ë",
  ouml: "ö",
  uuml: "ü",
  auml: "ä",
  iuml: "ï",
  ccedil: "ç",
  ntilde: "ñ",
  aacute: "á",
  oacute: "ó",
  iacute: "í",
  uacute: "ú",
  agrave: "à",
  ograve: "ò",
  ugrave: "ù",
  acirc: "â",
  ocirc: "ô",
  icirc: "î",
  ucirc: "û",
  aring: "å",
  aelig: "æ",
  oslash: "ø",
  szlig: "ß",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  euro: "€",
}

function decodeHtmlEntitiesOnce(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return entity
      try {
        return String.fromCodePoint(code)
      } catch {
        return entity
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity
  })
}

/** Decode named and numeric HTML entities, including one level of `&amp;` wrapping. */
export function decodeHtmlEntities(text: string): string {
  let decoded = decodeHtmlEntitiesOnce(text)
  if (decoded !== text && /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/i.test(decoded)) {
    decoded = decodeHtmlEntitiesOnce(decoded)
  }
  return decoded
}
