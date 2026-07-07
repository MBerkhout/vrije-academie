import { defineType, defineField } from "sanity"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"

const SOURCE_TYPE_OPTIONS = [
  { title: "Handmatig", value: "handpicked" },
  { title: "Automatisch (nieuwste)", value: "automated" },
] as const

export const vathuisProductRowBlock = defineType({
  name: "vathuisProductRowBlock",
  title: "VA Thuis productkaarten",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "Nieuw binnen",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "sourceType",
      title: "Source",
      type: "string",
      options: { list: [...SOURCE_TYPE_OPTIONS] },
      initialValue: "automated",
      components: { input: createButtonSelectInput([...SOURCE_TYPE_OPTIONS]) },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "products",
      title: "Products",
      type: "array",
      of: [{ type: "reference", to: [{ type: "product" }] }],
      hidden: ({ parent }) => parent?.sourceType !== "handpicked",
      validation: (Rule) =>
        Rule.custom((items, ctx) => {
          const parent = ctx.parent as { sourceType?: string }
          if (parent?.sourceType !== "handpicked") return true
          const count = Array.isArray(items) ? items.length : 0
          if (count < 1 || count > 12) return "Selecteer 1–12 producten."
          return true
        }),
    }),
    defineField({
      name: "limit",
      title: "Maximum items (automated)",
      type: "number",
      initialValue: 8,
      hidden: ({ parent }) => parent?.sourceType !== "automated",
      validation: (Rule) => Rule.min(1).max(12).integer(),
    }),
    defineField({
      name: "catalogCtaLabel",
      title: "Catalog CTA label",
      type: "string",
      initialValue: "Bekijk alle VA Thuis colleges",
    }),
  ],
  preview: {
    select: { title: "title", sourceType: "sourceType" },
    prepare({ title, sourceType }) {
      const sourceLabel = sourceType === "handpicked" ? "Handmatig" : "Automatisch"
      return {
        title: title || "VA Thuis productkaarten",
        subtitle: sourceLabel,
      }
    },
  },
})

export const surfaces = ["page"] as const
