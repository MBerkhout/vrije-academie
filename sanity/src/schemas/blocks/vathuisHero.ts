import { defineType, defineField } from "sanity"
import { defineImageField } from "../objects/imageField"

export const vathuisHeroBlock = defineType({
  name: "vathuisHeroBlock",
  title: "VA Thuis hero",
  type: "object",
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
    defineImageField({
      name: "image",
      title: "Image",
      spec: "vathuisHero",
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
