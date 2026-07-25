import { defineType, defineField } from "sanity"

/**
 * Lightweight SEO object — meta title/description/image plus noIndex toggle.
 * Open Graph tags on the storefront reuse the same meta fields.
 */
export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta title",
      type: "string",
      description: "Shown in search results and browser tabs. Aim for ~60 characters.",
      validation: (Rule) => Rule.max(70).warning("Keep meta titles under 60 characters when possible."),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta description",
      type: "text",
      rows: 3,
      description: "Short summary for search results and social sharing. Aim for ~150 characters.",
      validation: (Rule) =>
        Rule.max(160).warning("Keep meta descriptions under 150 characters when possible."),
    }),
    defineField({
      name: "metaImage",
      title: "Social image",
      type: "image",
      description: "Recommended 1200×630px. Used for Open Graph and Twitter cards.",
      options: { hotspot: true },
    }),
    defineField({
      name: "noIndex",
      title: "Hide from search engines",
      type: "boolean",
      description: "When enabled, adds noindex/nofollow and excludes this page from the sitemap.",
      initialValue: false,
    }),
  ],
})
