/**
 * Shared Portable Text block projection for Sanity GROQ queries.
 * Resolves link markDefs (internal pages + external URLs) to a storefront `href`.
 */
const PT_MARKDEFS = `markDefs[] {
  _key,
  _type,
  buttonType,
  label,
  url,
  "href": coalesce(
    href,
    externalUrl,
    select(
      defined(internalRef) && internalRef->_type == "page" && internalRef->slug.current == "/" => "/",
      defined(internalRef) && internalRef->_type == "page" => "/" + internalRef->slug.current
    )
  )
}`

export const GROQ_PORTABLE_TEXT_BLOCK = `{ _type, _key, children[] { _key, _type, text, marks }, ${PT_MARKDEFS}, listItem, style }`