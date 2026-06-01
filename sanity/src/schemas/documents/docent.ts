import { defineType, defineField } from "sanity"

/**
 * Docent (instructor) — mirrored from Medusa.
 * All fields are written by the Medusa sync subscriber. Do not edit in Studio.
 */
export const docent = defineType({
  name: "docent",
  title: "Docent",
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
      readOnly: true,
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "photoUrl",
      title: "Photo URL",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      readOnly: true,
    }),
    defineField({
      name: "subjectTags",
      title: "Subject tags",
      type: "array",
      of: [{ type: "string" }],
      readOnly: true,
    }),
  ],
  preview: {
    select: { name: "name", role: "role", medusaId: "medusaId" },
    prepare({ name, role, medusaId }) {
      return {
        title: name || "Docent",
        subtitle: [role, medusaId ? `medusa:${medusaId.slice(0, 12)}…` : null]
          .filter(Boolean)
          .join(" · "),
      }
    },
  },
})
