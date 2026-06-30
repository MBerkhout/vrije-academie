import { defineType, defineField } from "sanity"

export const vathuisCategoriesBlock = defineType({
  name: "vathuisCategoriesBlock",
  title: "VA Thuis categorieën",
  type: "document",
  fields: [
    defineField({
      name: "items",
      title: "Categories",
      type: "array",
      of: [
        {
          type: "object",
          preview: {
            select: { label: "category.label" },
            prepare({ label }) {
              return { title: label || "Kies categorie" }
            },
          },
          fields: [
            defineField({
              name: "category",
              title: "Category",
              type: "reference",
              to: [{ type: "category" }],
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.max(10),
      description:
        "Optional. When set, shows these categories in order. Otherwise shows categories with VA Thuis products, or top categories by sort order.",
    }),
    defineField({
      name: "maxItems",
      title: "Maximum categories",
      type: "number",
      initialValue: 4,
      validation: (Rule) => Rule.min(1).max(10).integer(),
      description: "Limit for automatic mode, or cap when more items are selected than shown.",
    }),
  ],
  preview: {
    select: { itemCount: "items" },
    prepare({ itemCount }) {
      const count = Array.isArray(itemCount) ? itemCount.length : 0
      return {
        title: "VA Thuis categorieën",
        subtitle: count > 0 ? `${count} selected` : "Automatic",
      }
    },
  },
})

export const surfaces = ["page"] as const
