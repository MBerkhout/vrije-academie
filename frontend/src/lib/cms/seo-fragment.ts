/** Shared GROQ projection for custom `seo` object fields on documents. */
export const SEO_FRAGMENT = `{
  metaTitle,
  metaDescription,
  metaImage { asset-> { url } },
  noIndex
}`

/** Inline field projection: `seo { … }` */
export const SEO_FIELD = `seo ${SEO_FRAGMENT}`
