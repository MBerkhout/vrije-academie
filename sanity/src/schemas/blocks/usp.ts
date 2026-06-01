import { defineType, defineField } from "sanity"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"
const USP_ITEM_SOURCE_OPTIONS = [
  { title: "Bibliotheek", value: "bibliotheek" },
  { title: "Aangepast", value: "aangepast" },
] as const

const USP_ITEMS_LAYOUT_OPTIONS = [
  { title: "Horizontal", value: "horizontal" },
  { title: "Vertical", value: "vertical" },
] as const

export const uspBlock = defineType({
  name: "uspBlock",
  title: "USP",
  type: "document",
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
            select: {
              source: "source",
              customTitle: "title",
              libraryTitle: "usp.title",
            },
            prepare({ source, customTitle, libraryTitle }) {
              const fromLibrary = source !== "aangepast"
              return {
                title: fromLibrary
                  ? libraryTitle || "Kies USP (bibliotheek)"
                  : customTitle || "Aangepast item",
                subtitle: fromLibrary ? "Bibliotheek" : "Aangepast",
              }
            },
          },
          fields: [
            defineField({
              name: "source",
              title: "Source",
              type: "string",
              options: { list: [...USP_ITEM_SOURCE_OPTIONS] },
              initialValue: "bibliotheek",
              components: { input: createButtonSelectInput([...USP_ITEM_SOURCE_OPTIONS]) },
            }),
            defineField({
              name: "usp",
              title: "USP",
              type: "reference",
              to: [{ type: "usp" }],
              hidden: ({ parent }) => parent?.source !== "bibliotheek",
              validation: (Rule) =>
                Rule.custom((ref, ctx) => {
                  const parent = ctx.parent as { source?: string }
                  if (parent?.source === "bibliotheek" && !ref) return "Selecteer een USP uit de bibliotheek."
                  return true
                }),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              hidden: ({ parent }) => parent?.source !== "aangepast",
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { source?: string }
                  if (parent?.source === "aangepast" && !v) return "USP-titel is verplicht."
                  if (v && v.length > 30) return "Max 30 karakters."
                  return true
                }),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "portableText",
              hidden: ({ parent }) => parent?.source !== "aangepast",
            }),
            defineField({
              name: "linkEnabled",
              title: "Show Link",
              type: "boolean",
              initialValue: false,
              hidden: ({ parent }) => parent?.source !== "aangepast",
            }),
            defineField({
              name: "linkLabel",
              title: "Link Label",
              type: "string",
              hidden: ({ parent }) => parent?.source !== "aangepast" || !parent?.linkEnabled,
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { source?: string; linkEnabled?: boolean }
                  if (parent?.source === "aangepast" && parent?.linkEnabled && !v)
                    return "Linktekst en URL zijn verplicht als link is ingeschakeld."
                  return true
                }),
            }),
            defineField({
              name: "linkUrl",
              title: "Link URL",
              type: "url",
              hidden: ({ parent }) => parent?.source !== "aangepast" || !parent?.linkEnabled,
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { source?: string; linkEnabled?: boolean }
                  if (parent?.source === "aangepast" && parent?.linkEnabled && !v)
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
