/**
 * Builds a Structure-tool deep link for a document.
 * `studioRootUrl` is the Studio app root including `basePath` (e.g. http://localhost:3333/studio).
 * Sanity v3+ uses `/structure/` instead of deprecated `/desk/`. With `basePath: "/studio"`, the path
 * segment is `/studio/structure/:schemaType;:documentId` (see Studio URL bar when editing a doc).
 */
export function sanityStructureDocumentUrl(
  studioRootUrl: string,
  schemaType: string,
  documentId: string
): string {
  const base = studioRootUrl.replace(/\/$/, "")
  return `${base}/studio/structure/${schemaType};${documentId}`
}

/** Mirrored product document in this project. */
export function sanityStructureProductUrl(studioRootUrl: string, medusaProductId: string): string {
  return sanityStructureDocumentUrl(
    studioRootUrl,
    "product",
    `medusa-product-${medusaProductId}`
  )
}

/** Mirrored category document (native Medusa product category). */
export function sanityStructureCategoryUrl(
  studioRootUrl: string,
  medusaCategoryId: string
): string {
  return sanityStructureDocumentUrl(
    studioRootUrl,
    "category",
    `medusa-category-${medusaCategoryId}`
  )
}
