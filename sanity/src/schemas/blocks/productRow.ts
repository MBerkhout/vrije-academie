import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"

const SOURCE_TYPE_OPTIONS = [
  { title: "Handmatig (4 producten)", value: "handpicked" },
  { title: "Automatisch (bestsellers / nieuwste)", value: "automated" },
  { title: "Persoonlijk (favorieten / recent bekeken)", value: "personalized" },
] as const

const AUTOMATED_FEED_OPTIONS = [
  { title: "Bestsellers", value: "bestsellers" },
  { title: "Nieuwste", value: "newest" },
] as const

export const productRowBlock = defineType({
  name: "productRowBlock",
  title: "Productkaarten",
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
      validation: (Rule) => Rule.required().error("Titel is verplicht."),
    }),
    defineField({
      name: "titleSize",
      title: "Title Size",
      type: "string",
      group: "content",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
    }),
    defineField({
      name: "sourceType",
      title: "Source",
      type: "string",
      group: "content",
      options: { list: [...SOURCE_TYPE_OPTIONS] },
      initialValue: "handpicked",
      components: { input: createButtonSelectInput([...SOURCE_TYPE_OPTIONS]) },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "products",
      title: "Products",
      type: "array",
      group: "content",
      of: [{ type: "reference", to: [{ type: "product" }] }],
      hidden: ({ parent }) => parent?.sourceType !== "handpicked",
      validation: (Rule) =>
        Rule.custom((items, ctx) => {
          const parent = ctx.parent as { sourceType?: string }
          if (parent?.sourceType !== "handpicked") return true
          const count = Array.isArray(items) ? items.length : 0
          if (count !== 4) return "Selecteer exact 4 producten."
          return true
        }),
    }),
    defineField({
      name: "automatedFeed",
      title: "Feed",
      type: "string",
      group: "content",
      options: { list: [...AUTOMATED_FEED_OPTIONS] },
      initialValue: "bestsellers",
      components: { input: createButtonSelectInput([...AUTOMATED_FEED_OPTIONS]) },
      hidden: ({ parent }) => parent?.sourceType !== "automated",
      validation: (Rule) =>
        Rule.custom((v, ctx) => {
          const parent = ctx.parent as { sourceType?: string }
          if (parent?.sourceType === "automated" && !v) return "Kies een feed."
          return true
        }),
    }),
    defineField({
      name: "titleFavorites",
      title: "Title (favorites)",
      type: "string",
      group: "content",
      description: "Shown when the visitor has saved products. Falls back to Title.",
      hidden: ({ parent }) => parent?.sourceType !== "personalized",
    }),
    defineField({
      name: "titleRecent",
      title: "Title (recently viewed)",
      type: "string",
      group: "content",
      description: "Shown when there are no favorites but there is browsing history. Falls back to Title.",
      hidden: ({ parent }) => parent?.sourceType !== "personalized",
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
      ...createLayoutField({
        marginTop: "24",
        marginBottom: "24",
        width: "full",
      } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title", sourceType: "sourceType" },
    prepare({ title, sourceType }) {
      const sourceLabel =
        sourceType === "handpicked"
          ? "Handmatig"
          : sourceType === "automated"
            ? "Automatisch"
            : sourceType === "personalized"
              ? "Persoonlijk"
              : "Productkaarten"
      return {
        title: title || "Productkaarten",
        subtitle: sourceLabel,
      }
    },
  },
})
export const surfaces = ["page"] as const
