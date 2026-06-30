import { defineType, defineField } from "sanity"

export const vathuisCategoriesBlock = defineType({
  name: "vathuisCategoriesBlock",
  title: "VA Thuis categorieën",
  type: "document",
  fields: [
    defineField({
      name: "maxItems",
      title: "Maximum categories",
      type: "number",
      initialValue: 5,
      validation: (Rule) => Rule.min(1).max(10).integer(),
      description: "Shows categories that have VA Thuis products (facet-filtered).",
    }),
  ],
  preview: {
    prepare() {
      return { title: "VA Thuis categorieën" }
    },
  },
})

export const surfaces = ["page"] as const
