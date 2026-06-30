/** Shared GROQ projection for `sanity-plugin-seo` fields on document `seo` objects. */
export const SEO_FRAGMENT = `{
  metaTitle,
  metaDescription,
  metaImage { asset-> { url } },
  openGraph { title, description, image { asset-> { url } } },
  robotsMeta,
  nofollowAttributes
}`

/** Inline field projection: `seo { … }` */
export const SEO_FIELD = `seo ${SEO_FRAGMENT}`
