import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { defineImageField } from "../objects/imageField"

/**
 * Catalog category — mirrored from Medusa.
 * `medusaId`, `slug`, and `label` are managed by Medusa and must not be edited in the Studio.
 * Editorial fields (`title`, `description`, `image`, `linkUrl`, `seo`) are preserved on Medusa sync.
 */
export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "medusaId",
      title: "Medusa ID",
      type: "string",
      description: "Set automatically by Medusa sync. Do not edit.",
      readOnly: true,
      hidden: false,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "string",
      description: "Managed by Medusa.",
      readOnly: true,
    }),
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      description: "Managed by Medusa.",
      readOnly: true,
      validation: (Rule) => Rule.required().max(30),
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description: "Managed by Medusa.",
      readOnly: true,
      initialValue: 0,
    }),
    defineField({
      name: "imageUrl",
      title: "Image URL",
      type: "string",
      description: "Managed by Medusa.",
      readOnly: true,
    }),
    defineField({
      name: "color",
      title: "Color",
      type: "string",
      description: "Managed by Medusa.",
      readOnly: true,
    }),
    defineField({
      name: "title",
      title: "Custom title",
      type: "string",
      group: "content",
      description: "Optional display title for category pages, tiles, and search (defaults to Medusa label).",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      group: "content",
      rows: 4,
      description: "Optional intro text on the category listing page and search excerpt.",
    }),
    defineImageField({
      name: "image",
      title: "Image",
      group: "content",
      spec: "categoryTile",
      extraDescription:
        "Categorietegel en zoekthumbnail (bijv. homepage-tegels). Re-seed met npm run seed:homepage-categories.",
      options: { hotspot: true },
    }),
    defineCtaUrlField({
      name: "linkUrl",
      title: "Link URL",
      group: "content",
      description: "Optional link override for category tiles and search results.",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
      group: "seo",
    }),
  ],
  orderings: [
    { title: "Sort Order", name: "sortOrderAsc", by: [{ field: "sortOrder", direction: "asc" }] },
  ],
  preview: {
    select: { label: "label", title: "title", medusaId: "medusaId", media: "image" },
    prepare({ label, title, medusaId, media }) {
      return {
        title: title?.trim() || label || "Category",
        subtitle: medusaId ? `medusa:${medusaId.slice(0, 12)}…` : "Not synced",
        media,
      }
    },
  },
})
