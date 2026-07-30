import { defineType, defineField, defineArrayMember } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { defineImageField } from "../objects/imageField"

export const vathuisPromoTilesBlock = defineType({
  name: "vathuisPromoTilesBlock",
  title: "VA Thuis promo tegels",
  type: "object",
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
            defineImageField({
              name: "image",
              title: "Image",
              spec: "promoTile",
              options: { hotspot: true },
            }),
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
