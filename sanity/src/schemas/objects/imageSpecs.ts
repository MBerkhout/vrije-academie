/**
 * Recommended image dimensions for Sanity image fields.
 * Derived from frontend rendering (SanityImage defaults, block components).
 */
export const IMAGE_SPECS = {
  social: {
    size: "1200×630px",
    aspect: "Open Graph / Twitter",
  },
  loginPortrait: {
    size: "1200×1600px",
    aspect: "portret",
  },
  heroSlide: {
    size: "1200×675px",
    aspect: "16:9 (~2/3 pagina breedte)",
  },
  heroTopPanel: {
    size: "minimaal 400px breed",
    aspect: "vrij formaat (object-contain, ~1/3 kolom)",
  },
  blockImage16x9: {
    size: "1200×675px",
    aspect: "16:9",
  },
  blockImageAspectRatio: {
    size: "1200×675px bij 16:9, 1200×900px bij 4:3, 1200×1200px bij 1:1",
    aspect: "match het gekozen beeldverhouding-veld",
  },
  editorialCard: {
    size: "640×360px",
    aspect: "16:9",
  },
  editorialBackground: {
    size: "1200×675px",
    aspect: "16:9 volle breedte sectie",
  },
  categoryTile: {
    size: "150×200px",
    aspect: "portret",
  },
  personPhoto: {
    size: "200×252px",
    aspect: "~4:5",
  },
  mobileMediaImage: {
    size: "768×432px",
    aspect: "16:9 mobiel alternatief",
  },
  promoTile: {
    size: "224×160px",
    aspect: "~7:5",
  },
  vathuisHero: {
    size: "1200×900px",
    aspect: "4:3",
  },
  plpBanner: {
    size: "1600×400px",
    aspect: "breed banner (~20% dekking)",
  },
  logo: {
    size: "SVG of ~320×48px",
    aspect: "horizontaal",
  },
} as const

export type ImageSpecKey = keyof typeof IMAGE_SPECS

/** Build a Dutch Studio description from a spec key and optional extra text. */
export function imageSpecDescription(
  spec: ImageSpecKey,
  extraDescription?: string,
): string {
  const { size, aspect } = IMAGE_SPECS[spec]
  const parts = [`Aanbevolen: ${size} (${aspect}).`]
  if (extraDescription?.trim()) {
    parts.push(extraDescription.trim())
  }
  return parts.join(" ")
}
