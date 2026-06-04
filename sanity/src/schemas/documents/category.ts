import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"

/**
 * Catalog category — mirrored from Medusa.
 * `medusaId`, `slug`, and `label` are managed by Medusa and must not be edited in the Studio.
 * `image` and `linkUrl` remain editable here for editorial purposes.
 */
export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
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
      name: "image",
      title: "Image (editorial override)",
      type: "image",
      description: "Optional editorial image override (e.g. for category tiles).",
      options: { hotspot: true },
    }),
    defineCtaUrlField({
      name: "linkUrl",
      title: "Link URL",
      description: "Optional link override for category tiles.",
    }),
  ],
  orderings: [
    { title: "Sort Order", name: "sortOrderAsc", by: [{ field: "sortOrder", direction: "asc" }] },
  ],
  preview: {
    select: { label: "label", medusaId: "medusaId" },
    prepare({ label, medusaId }) {
      return {
        title: label || "Category",
        subtitle: medusaId ? `medusa:${medusaId.slice(0, 12)}…` : "Not synced",
      }
    },
  },
})
