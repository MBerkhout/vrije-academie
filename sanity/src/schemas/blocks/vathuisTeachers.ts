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
  ],
  preview: {
    select: { title: "title" },
    prepare({ title }) {
      return { title: title || "VA Thuis docenten" }
    },
  },
})

export const surfaces = ["page"] as const
