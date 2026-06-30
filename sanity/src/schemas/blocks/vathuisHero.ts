import { defineType, defineField } from "sanity"

export const vathuisHeroBlock = defineType({
  name: "vathuisHeroBlock",
  title: "VA Thuis hero",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "De Vrije Academie bij jou thuis",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "intro",
      title: "Intro",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare({ title }) {
      return { title: title || "VA Thuis hero" }
    },
  },
})

export const surfaces = ["page"] as const
