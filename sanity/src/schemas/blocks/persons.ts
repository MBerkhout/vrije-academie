import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { createButtonMultiSelectInput, createButtonSelectInput } from "../../components/ButtonSelectInput"
import { PERSON_TYPE_OPTIONS } from "../../lib/personTypeOptions"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"

const DATA_SOURCE_OPTIONS = [
  { title: "Manual", value: "manual" },
  { title: "Dynamic", value: "dynamic" },
] as const

const DYNAMIC_SORT_OPTIONS = [
  { title: "Alphabetical A-Z", value: "alphabetical" },
  { title: "Most Recently Added", value: "recently_added" },
  { title: "Manual Order", value: "manual" },
] as const

const COLUMNS_DESKTOP_OPTIONS = [
  { title: "2", value: "2" },
  { title: "3", value: "3" },
  { title: "4", value: "4" },
] as const

export const personsBlock = defineType({
  name: "personsBlock",
  title: "Persons",
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
      name: "dataSource",
      title: "Data Source",
      type: "string",
      group: "content",
      options: { list: [...DATA_SOURCE_OPTIONS] },
      initialValue: "manual",
      components: { input: createButtonSelectInput([...DATA_SOURCE_OPTIONS]) },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "persons",
      title: "Persons",
      type: "array",
      group: "content",
      of: [{ type: "reference", to: [{ type: "person" }] }],
      validation: (Rule) =>
        Rule.custom((arr, ctx) => {
          const doc = ctx.document as { dataSource?: string }
          if (doc?.dataSource === "manual" && (!arr || arr.length === 0))
            return "Selecteer minimaal 1 persoon."
          if (doc?.dataSource === "manual" && arr && arr.length > 12) return "Maximaal 12 personen."
          return true
        }),
      hidden: ({ parent }) => parent?.dataSource !== "manual",
    }),
    defineField({
      name: "dynamicFilters",
      title: "Filters",
      type: "object",
      group: "content",
      fields: [
        defineField({
          name: "typeTags",
          title: "Type (filter)",
          description:
            "Toon personen waarvan het type in deze lijst voorkomt (meerdere opties = OF). Leeg = alle types.",
          type: "array",
          of: [{ type: "string" }],
          options: { list: [...PERSON_TYPE_OPTIONS] },
          validation: (Rule) => Rule.unique(),
          components: { input: createButtonMultiSelectInput([...PERSON_TYPE_OPTIONS]) },
        }),
        defineField({
          name: "subjectTags",
          title: "Subject",
          type: "array",
          of: [{ type: "string" }],
        }),
        defineField({
          name: "exclude",
          title: "Exclude Persons",
          type: "array",
          of: [{ type: "reference", to: [{ type: "person" }] }],
        }),
        defineField({
          name: "maxItems",
          title: "Max Items",
          description: "Leave empty to show everyone matching the filters.",
          type: "number",
          validation: (Rule) => Rule.min(1).max(200),
        }),
        defineField({
          name: "sort",
          title: "Sort",
          type: "string",
          options: { list: [...DYNAMIC_SORT_OPTIONS] },
          initialValue: "alphabetical",
          components: { input: createButtonSelectInput([...DYNAMIC_SORT_OPTIONS]) },
        }),
      ],
      hidden: ({ parent }) => parent?.dataSource !== "dynamic",
    }),
    defineField({
      name: "searchOnPage",
      title: "Search on page",
      description: "Shows a search field above the list; filters names, roles and bios in the browser.",
      type: "boolean",
      group: "content",
      initialValue: false,
    }),
    defineField({
      name: "searchPlaceholder",
      title: "Search placeholder",
      type: "string",
      group: "content",
      hidden: ({ parent }) => !parent?.searchOnPage,
    }),
    defineField({
      name: "columnsDesktop",
      title: "Columns Desktop",
      type: "string",
      group: "content",
      options: { list: [...COLUMNS_DESKTOP_OPTIONS] },
      initialValue: "3",
      components: { input: createButtonSelectInput([...COLUMNS_DESKTOP_OPTIONS]) },
    }),
    defineField({
      name: "ctaEnabled",
      title: "Show CTA",
      type: "boolean",
      group: "content",
      initialValue: false,
    }),
    defineField({
      name: "ctaLabel",
      title: "CTA Label",
      type: "string",
      group: "content",
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
    select: { title: "title", dataSource: "dataSource" },
    prepare({ title, dataSource }) {
      return { title: title || "Persons", subtitle: dataSource === "dynamic" ? "Dynamic" : "Manual" }
    },
  },
})
export const surfaces = ['page'] as const
