/**
 * GROQ image field projection — keeps hotspot/crop for @sanity/image-url.
 * Use inside `{ ... }` e.g. `mediaImage { ${GROQ_SANITY_IMAGE_FIELDS} }`.
 */
export const GROQ_SANITY_IMAGE_FIELDS = `asset->, hotspot, crop, alt`

/** Same fields when asset metadata (dimensions) is needed. */
export const GROQ_SANITY_IMAGE_FIELDS_WITH_DIMENSIONS = `asset-> { _id, url, metadata { dimensions } }, hotspot, crop, alt`

/** Person photo (no alt on nested image object). */
export const GROQ_SANITY_PERSON_PHOTO_FIELDS = `asset->, hotspot, crop`

export const GROQ_SANITY_PERSON_PHOTO_FIELDS_WITH_URL = `asset-> { _id, url }, hotspot, crop`
