import { defineType, defineField } from "sanity"

/**
 * Catalog city (plaats) — mirrored from Medusa.
 * `medusaId`, `slug`, and `label` are managed by Medusa and must not be edited in the Studio.
 */
export const city = defineType({
  name: "city",
  title: "City (Plaats)",
  type: "document",
  fields: [
    defineField({
      name: "medusaId",
      title: "Medusa ID",
      type: "string",
      description: "Set automatically by Medusa sync. Do not edit.",
      readOnly: true,
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
      validation: (Rule) => Rule.required(),
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
      name: "seo",
      title: "SEO",
      type: "seo",
      description: "Optional SEO for the city listing page (/ons-aanbod/plaats/[slug]).",
    }),
  ],
  orderings: [
    { title: "Sort Order", name: "sortOrderAsc", by: [{ field: "sortOrder", direction: "asc" }] },
  ],
  preview: {
    select: { label: "label", medusaId: "medusaId" },
    prepare({ label, medusaId }) {
      return {
        title: label || "City",
        subtitle: medusaId ? `medusa:${medusaId.slice(0, 12)}…` : "Not synced",
      }
    },
  },
})
