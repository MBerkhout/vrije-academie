import { defineType, defineField } from "sanity"

export const vathuisTeachersBlock = defineType({
  name: "vathuisTeachersBlock",
  title: "VA Thuis docenten",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "Populaire docenten",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "intro",
      title: "Intro",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "docenten",
      title: "Docenten",
      type: "array",
      description:
        "Kies de docenten voor dit blok. Zonder selectie toont de site (tijdelijk) alle docenten, alfabetisch, max. 12.",
      of: [{ type: "reference", to: [{ type: "docent" }] }],
      validation: (Rule) => Rule.max(12),
    }),
  ],
  preview: {
    select: { title: "title", docentCount: "docenten.length" },
    prepare({ title, docentCount }) {
      const count = typeof docentCount === "number" ? docentCount : 0
      const subtitle = count > 0 ? `${count} docent${count === 1 ? "" : "en"}` : "Geen docenten gekozen"
      return { title: title || "VA Thuis docenten", subtitle }
    },
  },
})

export const surfaces = ["page"] as const
