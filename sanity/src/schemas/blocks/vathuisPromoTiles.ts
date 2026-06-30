import { defineType, defineField, defineArrayMember } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"

export const vathuisPromoTilesBlock = defineType({
  name: "vathuisPromoTilesBlock",
  title: "VA Thuis promo tegels",
  type: "document",
  fields: [
    defineField({
      name: "tiles",
      title: "Tiles",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "vathuisPromoTile",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (R) => R.required(),
            }),
            defineField({ name: "description", title: "Description", type: "text", rows: 2 }),
            defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true } }),
            defineCtaUrlField({ name: "href", title: "Link URL" }),
          ],
          preview: {
            select: { title: "title" },
            prepare({ title }) {
              return { title: title || "Promo tile" }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "VA Thuis promo tegels" }
    },
  },
})

export const surfaces = ["page"] as const
