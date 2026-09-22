export type PdpGalleryImage = {
  url: string
  caption?: string | null
}

type GalleryImageInput = string | { url?: string | null; caption?: string | null }

/**
 * HTML 4 Latin-1 named entities in code-point order 160–255.
 * Salesforce artwork credits use these plus a few markup/punctuation names.
 */
const LATIN1_ENTITY_NAMES =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'.split(
    ' ',
  )

const EXTRA_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '\u2013',
  mdash: '\u2014',
  nbsp: '\u00a0',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  sbquo: '\u201a',
  bdquo: '\u201e',
  euro: '\u20ac',
  trade: '\u2122',
  bull: '\u2022',
}

const LATIN1_ENTITY_BY_NAME = new Map(
  LATIN1_ENTITY_NAMES.map((name, index) => [name.toLowerCase(), String.fromCharCode(160 + index)]),
)

function namedEntityChar(name: string): string | undefined {
  const key = name.toLowerCase()
  return EXTRA_NAMED_ENTITIES[key] ?? LATIN1_ENTITY_BY_NAME.get(key)
}

function decodeHtmlEntitiesOnce(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return entity
      try {
        return String.fromCodePoint(code)
      } catch {
        return entity
      }
    }
    return namedEntityChar(body) ?? entity
  })
}

/** Decode named and numeric HTML entities stored in Salesforce credits. */
export function decodePdpGalleryCaptionEntities(text: string): string {
  let decoded = decodeHtmlEntitiesOnce(text)
  if (decoded !== text && /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/i.test(decoded)) {
    decoded = decodeHtmlEntitiesOnce(decoded)
  }
  return decoded
}

/**
 * Repair UTF-8 bytes that were decoded as Latin-1 (havenscÃ¨ne → havenscène).
 * Leaves the original string when the bytes are not valid UTF-8.
 */
export function repairPdpGalleryCaptionMojibake(text: string): string {
  if (!/[ÃÂ]/.test(text)) return text
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 255) return text
  }
  try {
    const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return text
  }
}

/** Composite artwork credits in Salesforce use ` | ` between the two halves. */
export function formatPdpGalleryCaption(caption: string): string {
  return repairPdpGalleryCaptionMojibake(decodePdpGalleryCaptionEntities(caption)).replace(
    /\s*\|\s*/g,
    '\n',
  )
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Plain caption text for alt attributes and other non-HTML contexts. */
export function stripPdpGalleryCaptionHtml(caption: string): string {
  return formatPdpGalleryCaption(caption)
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
}

/** Caption HTML for hover overlays; keeps inline emphasis tags from Salesforce. */
export function formatPdpGalleryCaptionHtml(caption: string): string {
  const escaped = escapeHtml(formatPdpGalleryCaption(caption))
  return escaped.replace(/&lt;(\/?(?:em|strong))&gt;/gi, '<$1>')
}

/** Normalize URL list or `{ url, caption }` items to gallery tiles (dedupe, max 4). */
export function toPdpGalleryImages(images: GalleryImageInput[]): PdpGalleryImage[] {
  const seen = new Set<string>()
  const unique: PdpGalleryImage[] = []

  for (const item of images) {
    const url = (typeof item === 'string' ? item : item.url)?.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    const caption =
      typeof item === 'string' ? null : item.caption?.trim() || null
    unique.push({ url, caption })
    if (unique.length >= 4) break
  }

  return unique
}
