import { defineType, defineField } from "sanity"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"

const HEIGHT_PRESETS = [
  { title: "XS (16px)", value: "xs" },
  { title: "SM (24px)", value: "sm" },
  { title: "MD (48px)", value: "md" },
  { title: "LG (80px)", value: "lg" },
  { title: "XL (112px)", value: "xl" },
  { title: "2XL (144px)", value: "2xl" },
  { title: "Custom", value: "custom" },
] as const

export const whitespaceBlock = defineType({
  name: "whitespaceBlock",
  title: "Whitespace",
  type: "object",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "height",
      title: "Height",
      type: "string",
      group: "content",
      options: { list: [...HEIGHT_PRESETS] },
      components: { input: createButtonSelectInput([...HEIGHT_PRESETS]) },
      initialValue: "md",
      validation: (Rule) =>
        Rule.custom((v) => {
          const valid = ["xs", "sm", "md", "lg", "xl", "2xl", "custom"].includes(v || "")
          return valid || "Invalid height preset"
        }),
    }),
    defineField({
      name: "customHeight",
      title: "Custom Height (px)",
      type: "number",
      group: "content",
      description: "Min 4px, max 400px. Aangepaste hoogte wijkt af van het ontwerpsysteem.",
      validation: (Rule) =>
        Rule.custom((v, ctx) => {
          const doc = ctx.document as { height?: string }
          if (doc?.height !== "custom") return true
          if (v == null || v === "") return "Vul een hoogte in bij custom."
          if (v < 4) return "Minimale hoogte is 4px."
          if (v > 400) return "Maximale hoogte is 400px."
          return true
        }),
      hidden: ({ document }) => document?.height !== "custom",
    }),
    defineField({
      ...createLayoutField({ marginTop: "0", marginBottom: "0" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { height: "height", customHeight: "customHeight" },
    prepare({ height, customHeight }) {
      const label = height === "custom" && customHeight ? `${customHeight}px` : height || "md"
      return {
        title: "Whitespace",
        subtitle: label,
      }
    },
  },
})
export const surfaces = ['page', 'pdp'] as const
