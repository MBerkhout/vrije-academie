import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"

const CATEGORY_SOURCE_OPTIONS = [
  { title: "Bibliotheek", value: "bibliotheek" },
  { title: "Aangepast", value: "aangepast" },
] as const

const CATEGORIES_COLUMNS_DESKTOP = [
  { title: "4 columns", value: "4" },
  { title: "8 columns", value: "8" },
] as const

export const categoriesBlock = defineType({
  name: "categoriesBlock",
  title: "Categories",
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
      name: "introText",
      title: "Intro Text",
      type: "portableText",
      group: "content",
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
              customLabel: "label",
              libraryLabel: "category.label",
            },
            prepare({ source, customLabel, libraryLabel }) {
              const fromLibrary = source !== "aangepast"
              return {
                title: fromLibrary
                  ? libraryLabel || "Kies categorie (bibliotheek)"
                  : customLabel || "Aangepast item",
                subtitle: fromLibrary ? "Bibliotheek" : "Aangepast",
              }
            },
          },
          fields: [
            defineField({
              name: "source",
              title: "Source",
              type: "string",
              options: { list: [...CATEGORY_SOURCE_OPTIONS] },
              initialValue: "bibliotheek",
              components: { input: createButtonSelectInput([...CATEGORY_SOURCE_OPTIONS]) },
            }),
            defineField({
              name: "category",
              title: "Category",
              type: "reference",
              to: [{ type: "category" }],
              hidden: ({ parent }) => parent?.source !== "bibliotheek",
              validation: (Rule) =>
                Rule.custom((ref, ctx) => {
                  const parent = ctx.parent as { source?: string }
                  if (parent?.source === "bibliotheek" && !ref) return "Selecteer een categorie."
                  return true
                }),
            }),
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              hidden: ({ parent }) => parent?.source !== "aangepast",
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { source?: string }
                  if (parent?.source === "aangepast" && !v) return "Label is verplicht."
                  if (parent?.source === "aangepast" && v && v.length > 30) return "Max 30 karakters."
                  return true
                }),
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              hidden: ({ parent }) => parent?.source !== "aangepast",
              validation: (Rule) =>
                Rule.custom((img, ctx) => {
                  const parent = ctx.parent as { source?: string }
                  if (parent?.source === "aangepast" && !img) return "Afbeelding is verplicht."
                  return true
                }),
            }),
            defineCtaUrlField({
              name: "url",
              title: "URL",
              hidden: ({ parent }) => parent?.source !== "aangepast",
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { source?: string }
                  if (parent?.source === "aangepast" && !v) return "URL is verplicht."
                  return true
                }),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().length(8).error("Vul exact 8 items in."),
    }),
    defineField({
      name: "columnsDesktop",
      title: "Columns Desktop",
      type: "string",
      group: "content",
      options: { list: [...CATEGORIES_COLUMNS_DESKTOP] },
      initialValue: "4",
      components: { input: createButtonSelectInput([...CATEGORIES_COLUMNS_DESKTOP]) },
    }),
    defineField({
      name: "ctaEnabled",
      title: "Show CTA Button",
      type: "boolean",
      group: "content",
      initialValue: false,
    }),
    defineField({
      name: "ctaLabel",
      title: "CTA Label",
      type: "string",
      group: "content",
      initialValue: "Bekijk ons volledige aanbod",
      hidden: ({ parent }) => !parent?.ctaEnabled,
      validation: (Rule) =>
        Rule.custom((v, ctx) => {
          const parent = ctx.parent as { ctaEnabled?: boolean }
          if (parent?.ctaEnabled && !v) return "Vul de linktekst en URL in."
          return true
        }),
    }),
    defineCtaUrlField({
      name: "ctaUrl",
      title: "CTA URL",
      group: "content",
      hidden: ({ parent }) => !parent?.ctaEnabled,
      validation: (Rule) =>
        Rule.custom((v, ctx) => {
          const parent = ctx.parent as { ctaEnabled?: boolean }
          if (parent?.ctaEnabled && !v) return "Vul de linktekst en URL in."
          return true
        }),
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare({ title }) {
      return { title: title || "Categories", subtitle: "8 tiles" }
    },
  },
})
export const surfaces = ['page'] as const
