import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"

const USP_ITEMS_LAYOUT_OPTIONS = [
  { title: "Horizontal", value: "horizontal" },
  { title: "Vertical", value: "vertical" },
] as const

export const uspBlock = defineType({
  name: "uspBlock",
  title: "USP",
  type: "object",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "titleSize",
      title: "Title Size",
      type: "string",
      group: "content",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "items",
      title: "Items",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          preview: {
            select: { title: "title" },
            prepare({ title }) {
              return { title: title || "USP item" }
            },
          },
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) =>
                Rule.required().max(30).error("USP-titel is verplicht (max 30 karakters)."),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "portableText",
            }),
            defineField({
              name: "linkEnabled",
              title: "Show Link",
              type: "boolean",
              initialValue: false,
            }),
            defineField({
              name: "linkLabel",
              title: "Link Label",
              type: "string",
              hidden: ({ parent }) => !parent?.linkEnabled,
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { linkEnabled?: boolean }
                  if (parent?.linkEnabled && !v)
                    return "Linktekst en URL zijn verplicht als link is ingeschakeld."
                  return true
                }),
            }),
            defineCtaUrlField({
              name: "linkUrl",
              title: "Link URL",
              hidden: ({ parent }) => !parent?.linkEnabled,
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { linkEnabled?: boolean }
                  if (parent?.linkEnabled && !v)
                    return "Linktekst en URL zijn verplicht."
                  return true
                }),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().length(3).error("Vul exact 3 items in."),
    }),
    defineField({
      name: "itemsLayout",
      title: "Items Layout",
      type: "string",
      group: "content",
      options: { list: [...USP_ITEMS_LAYOUT_OPTIONS] },
      initialValue: "horizontal",
      components: { input: createButtonSelectInput([...USP_ITEMS_LAYOUT_OPTIONS]) },
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare({ title }) {
      return { title: title || "USP", subtitle: "3 items" }
    },
  },
})
export const surfaces = ['page'] as const
