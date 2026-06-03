import { defineType, defineField } from "sanity"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import {
  ASPECT_RATIO_OPTIONS,
  OVERLAY_OPTIONS,
  TITLE_ALIGNMENT_OPTIONS,
  TITLE_SIZE_OPTIONS,
  overlayField,
  aspectRatioField,
} from "../objects/mediaEnums"
import { createButtonNumberSelectInput, createButtonSelectInput } from "../../components/ButtonSelectInput"

const COLUMN_TYPES = [
  { title: "Text", value: "text" },
  { title: "Media", value: "media" },
  { title: "Highlight Card", value: "highlightCard" },
  { title: "Product Cards", value: "productCards" },
  { title: "CTA Card", value: "ctaCard" },
  { title: "Person Card", value: "personCard" },
] as const

const NUMBER_OF_COLUMNS_OPTIONS = [
  { title: "4", value: 4 },
  { title: "3", value: 3 },
  { title: "2", value: 2 },
  { title: "1", value: 1 },
] as const

const COLUMN_GAP_OPTIONS = [
  { title: "Small (16px)", value: "sm" },
  { title: "Medium (32px)", value: "md" },
  { title: "Large (64px)", value: "lg" },
] as const

const COLUMN_WIDTH_OPTIONS = [
  { title: "Equal", value: "equal" },
  { title: "Narrow", value: "narrow" },
  { title: "Wide", value: "wide" },
] as const

const VERTICAL_ALIGNMENT_OPTIONS = [
  { title: "Top", value: "top" },
  { title: "Center", value: "center" },
  { title: "Bottom", value: "bottom" },
] as const

const COLUMN_MEDIA_TYPE_OPTIONS = [
  { title: "Image", value: "image" },
  { title: "YouTube", value: "youtube" },
] as const

export const columnsBlock = defineType({
  name: "columnsBlock",
  title: "Columns",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "sectionTitle",
      title: "Section Title",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "sectionTitleSize",
      title: "Heading size",
      type: "string",
      group: "content",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
      validation: (Rule) => Rule.required(),
      hidden: ({ parent }) => !parent?.sectionTitle,
    }),
    defineField({
      name: "sectionTitleAlignment",
      title: "Heading alignment",
      type: "string",
      group: "content",
      options: { list: [...TITLE_ALIGNMENT_OPTIONS] },
      initialValue: "left",
      components: { input: createButtonSelectInput([...TITLE_ALIGNMENT_OPTIONS]) },
      validation: (Rule) => Rule.required(),
      hidden: ({ parent }) => !parent?.sectionTitle,
    }),
    defineField({
      name: "introText",
      title: "Intro",
      type: "portableText",
      group: "content",
    }),
    defineField({
      name: "numberOfColumns",
      title: "Number of Columns",
      type: "number",
      group: "content",
      options: { list: [...NUMBER_OF_COLUMNS_OPTIONS] },
      initialValue: 3,
      components: { input: createButtonNumberSelectInput([...NUMBER_OF_COLUMNS_OPTIONS]) },
      validation: (Rule) => Rule.required().min(1).max(4),
    }),
    defineField({
      name: "columnGap",
      title: "Column Gap",
      type: "string",
      group: "content",
      options: { list: [...COLUMN_GAP_OPTIONS] },
      initialValue: "md",
      components: { input: createButtonSelectInput([...COLUMN_GAP_OPTIONS]) },
    }),
    defineField({
      name: "columns",
      title: "Columns",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "columnType",
              title: "Column Type",
              type: "string",
              options: { list: [...COLUMN_TYPES] },
              components: { input: createButtonSelectInput([...COLUMN_TYPES]) },
              validation: (Rule) => Rule.required().error("Selecteer een kolomtype."),
            }),
            defineField({
              name: "width",
              title: "Width",
              type: "string",
              description:
                "With 2+ columns: relative flex width. With 1 column: Narrow caps content to a readable width (~600px); Equal/Wide use full block width.",
              options: { list: [...COLUMN_WIDTH_OPTIONS] },
              initialValue: "equal",
              components: { input: createButtonSelectInput([...COLUMN_WIDTH_OPTIONS]) },
            }),
            defineField({
              name: "verticalAlignment",
              title: "Vertical Alignment",
              type: "string",
              options: { list: [...VERTICAL_ALIGNMENT_OPTIONS] },
              initialValue: "top",
              components: { input: createButtonSelectInput([...VERTICAL_ALIGNMENT_OPTIONS]) },
            }),
            // Text column
            defineField({
              name: "textTitle",
              title: "Title",
              type: "string",
              hidden: ({ parent }) => parent?.columnType !== "text",
            }),
            defineField({
              name: "textTitleSize",
              title: "Heading size",
              type: "string",
              options: { list: [...TITLE_SIZE_OPTIONS] },
              initialValue: "h3",
              components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
              validation: (Rule) => Rule.required(),
              hidden: ({ parent }) => parent?.columnType !== "text" || !parent?.textTitle,
            }),
            defineField({
              name: "textContent",
              title: "Content",
              type: "portableText",
              hidden: ({ parent }) => parent?.columnType !== "text",
            }),
            // Media column
            defineField({
              name: "mediaType",
              title: "Media Type",
              type: "string",
              options: { list: [...COLUMN_MEDIA_TYPE_OPTIONS] },
              initialValue: "image",
              components: { input: createButtonSelectInput([...COLUMN_MEDIA_TYPE_OPTIONS]) },
              hidden: ({ parent }) => parent?.columnType !== "media",
            }),
            defineField({
              name: "mediaImage",
              title: "Image",
              type: "image",
              hidden: ({ parent }) => parent?.columnType !== "media" || parent?.mediaType !== "image",
              validation: (Rule) =>
                Rule.custom((img, ctx) => {
                  const parent = ctx.parent as { columnType?: string; mediaType?: string }
                  if (parent?.columnType === "media" && parent?.mediaType === "image" && !img)
                    return "Afbeelding is verplicht."
                  return true
                }),
            }),
            defineField({
              name: "mediaImageAlt",
              title: "Alt Text",
              type: "string",
              hidden: ({ parent }) =>
                parent?.columnType !== "media" || parent?.mediaType !== "image",
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as {
                    columnType?: string
                    mediaType?: string
                    mediaImage?: unknown
                  }
                  if (
                    parent?.columnType === "media" &&
                    parent?.mediaType === "image" &&
                    parent?.mediaImage &&
                    !v
                  )
                    return "Alt tekst is verplicht."
                  return true
                }),
            }),
            defineField({
              name: "mediaYoutubeUrl",
              title: "YouTube URL",
              type: "url",
              hidden: ({ parent }) => parent?.columnType !== "media" || parent?.mediaType !== "youtube",
            }),
            defineField({
              name: "mediaMobileImage",
              title: "Different Mobile Image",
              type: "boolean",
              initialValue: false,
              hidden: ({ parent }) => parent?.columnType !== "media",
            }),
            defineField({
              name: "mediaMobileImageAsset",
              title: "Mobile Image",
              type: "image",
              hidden: ({ parent }) =>
                parent?.columnType !== "media" || !parent?.mediaMobileImage,
            }),
            defineField({
              name: "mediaCaption",
              title: "Caption",
              type: "string",
              validation: (Rule) => Rule.max(120),
              hidden: ({ parent }) => parent?.columnType !== "media",
            }),
            defineField({
              ...aspectRatioField({ name: "mediaAspectRatio" }),
              hidden: ({ parent }) => parent?.columnType !== "media",
              components: { input: createButtonSelectInput([...ASPECT_RATIO_OPTIONS]) },
            }),
            // Highlight card
            defineField({
              name: "highlightImage",
              title: "Image",
              type: "image",
              hidden: ({ parent }) => parent?.columnType !== "highlightCard",
              validation: (Rule) =>
                Rule.custom((img, ctx) => {
                  const parent = ctx.parent as { columnType?: string }
                  if (parent?.columnType === "highlightCard" && !img)
                    return "Afbeelding is verplicht."
                  return true
                }),
            }),
            defineField({
              name: "highlightTitle",
              title: "Title",
              type: "string",
              hidden: ({ parent }) => parent?.columnType !== "highlightCard",
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { columnType?: string }
                  if (parent?.columnType === "highlightCard" && !v) return "Titel is verplicht."
                  return true
                }),
            }),
            defineField({
              name: "highlightTitleSize",
              title: "Heading size",
              type: "string",
              options: { list: [...TITLE_SIZE_OPTIONS] },
              initialValue: "h3",
              components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
              validation: (Rule) => Rule.required(),
              hidden: ({ parent }) => parent?.columnType !== "highlightCard" || !parent?.highlightTitle,
            }),
            defineField({
              name: "highlightTeaser",
              title: "Teaser",
              type: "portableText",
              description: "Max 300 chars recommended",
              hidden: ({ parent }) => parent?.columnType !== "highlightCard",
            }),
            defineField({
              name: "highlightLabel",
              title: "Label",
              type: "string",
              validation: (Rule) => Rule.max(30),
              hidden: ({ parent }) => parent?.columnType !== "highlightCard",
            }),
            // Product cards - manual only (TODO: future source integration)
            defineField({
              name: "productCardsTitle",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.max(60),
              hidden: ({ parent }) => parent?.columnType !== "productCards",
            }),
            defineField({
              name: "productCardsManualItems",
              title: "Manual Items",
              type: "array",
              of: [{ type: "reference", to: [{ type: "product" }] }],
              hidden: ({ parent }) => parent?.columnType !== "productCards",
              description: "Mirrored Medusa products (max 3 recommended per column).",
            }),
            defineField({
              name: "productCardsItemCtaLabel",
              title: "Card CTA label",
              type: "string",
              validation: (Rule) => Rule.max(40),
              hidden: ({ parent }) => parent?.columnType !== "productCards",
              description:
                'Shown on each product card (e.g. "VAthuis – ON DEMAND", "Bekijk meer", "Exclusief in Amsterdam").',
            }),
            defineField({
              name: "productCardsFooterCtaEnabled",
              title: "Footer CTA",
              type: "boolean",
              initialValue: false,
              hidden: ({ parent }) => parent?.columnType !== "productCards",
            }),
            defineField({
              name: "productCardsFooterCtaLabel",
              title: "CTA Label",
              type: "string",
              hidden: ({ parent }) =>
                parent?.columnType !== "productCards" || !parent?.productCardsFooterCtaEnabled,
            }),
            defineField({
              name: "productCardsFooterCtaUrl",
              title: "CTA URL",
              type: "url",
              hidden: ({ parent }) =>
                parent?.columnType !== "productCards" || !parent?.productCardsFooterCtaEnabled,
            }),
            // CTA card
            defineField({
              name: "ctaCardBgImage",
              title: "Background Image",
              type: "image",
              hidden: ({ parent }) => parent?.columnType !== "ctaCard",
              validation: (Rule) =>
                Rule.custom((img, ctx) => {
                  const parent = ctx.parent as { columnType?: string }
                  if (parent?.columnType === "ctaCard" && !img)
                    return "Achtergrondafbeelding is verplicht."
                  return true
                }),
            }),
            defineField({
              name: "ctaCardTitle",
              title: "Title",
              type: "string",
              hidden: ({ parent }) => parent?.columnType !== "ctaCard",
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const parent = ctx.parent as { columnType?: string }
                  if (parent?.columnType === "ctaCard" && !v) return "Titel is verplicht."
                  return true
                }),
            }),
            defineField({
              name: "ctaCardTitleSize",
              title: "Heading size",
              type: "string",
              options: { list: [...TITLE_SIZE_OPTIONS] },
              initialValue: "h3",
              components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
              validation: (Rule) => Rule.required(),
              hidden: ({ parent }) => parent?.columnType !== "ctaCard" || !parent?.ctaCardTitle,
            }),
            defineField({
              ...overlayField({ name: "ctaCardOverlay" }),
              hidden: ({ parent }) => parent?.columnType !== "ctaCard",
              components: { input: createButtonSelectInput([...OVERLAY_OPTIONS]) },
            }),
            defineField({
              name: "ctaCardBody",
              title: "Body",
              type: "portableText",
              hidden: ({ parent }) => parent?.columnType !== "ctaCard",
            }),
            defineField({
              name: "ctaCardCtaEnabled",
              title: "Show CTA",
              type: "boolean",
              initialValue: false,
              hidden: ({ parent }) => parent?.columnType !== "ctaCard",
            }),
            defineField({
              name: "ctaCardCtaLabel",
              title: "CTA Label",
              type: "string",
              hidden: ({ parent }) =>
                parent?.columnType !== "ctaCard" || !parent?.ctaCardCtaEnabled,
            }),
            defineField({
              name: "ctaCardCtaUrl",
              title: "CTA URL",
              type: "url",
              hidden: ({ parent }) =>
                parent?.columnType !== "ctaCard" || !parent?.ctaCardCtaEnabled,
            }),
            // Person card
            defineField({
              name: "person",
              title: "Person",
              type: "reference",
              to: [{ type: "person" }],
              hidden: ({ parent }) => parent?.columnType !== "personCard",
              validation: (Rule) =>
                Rule.custom((ref, ctx) => {
                  const parent = ctx.parent as { columnType?: string }
                  if (parent?.columnType === "personCard" && !ref)
                    return "Selecteer een persoon."
                  return true
                }),
            }),
            defineField({
              name: "personShowBio",
              title: "Show Bio",
              type: "boolean",
              initialValue: true,
              hidden: ({ parent }) => parent?.columnType !== "personCard",
            }),
            defineField({
              name: "personShowLink",
              title: "Show Profile Link",
              type: "boolean",
              initialValue: true,
              hidden: ({ parent }) => parent?.columnType !== "personCard",
            }),
          ],
        },
      ],
      validation: (Rule) =>
        Rule.custom((cols, ctx) => {
          // Prefer parent: sibling fields share the same object; ctx.document can lag behind
          // the in-form value while editing, which incorrectly defaulted to 3 columns.
          const block = ctx.parent as { numberOfColumns?: unknown } | undefined
          const doc = ctx.document as { numberOfColumns?: unknown } | undefined
          const raw = block?.numberOfColumns ?? doc?.numberOfColumns
          let num = 3
          if (typeof raw === "number" && raw >= 1 && raw <= 4) num = raw
          else if (typeof raw === "string" && raw !== "") {
            const n = Number.parseInt(raw, 10)
            if (n >= 1 && n <= 4) num = n
          }
          if (Array.isArray(cols) && cols.length !== num)
            return `Aantal kolommen moet ${num} zijn.`
          return true
        }),
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { sectionTitle: "sectionTitle", numberOfColumns: "numberOfColumns" },
    prepare({ sectionTitle, numberOfColumns }) {
      return {
        title: sectionTitle || "Columns",
        subtitle: `${numberOfColumns ?? 3} column(s)`,
      }
    },
  },
})
export const surfaces = ['page', 'pdp'] as const
