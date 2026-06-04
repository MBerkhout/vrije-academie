import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { OVERLAY_OPTIONS, TITLE_SIZE_OPTIONS, overlayField } from "../objects/mediaEnums"

const HERO_HEIGHT_OPTIONS = [
  { title: "Compact", value: "sm" },
  { title: "Medium", value: "md" },
  { title: "Large", value: "lg" },
  { title: "Panorama (laag, breed)", value: "wide" },
]

export const featuredTripBlock = defineType({
  name: "featuredTripBlock",
  title: "Uitgelichte reis (magazine)",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "infoCard", title: "Infokaart" },
    { name: "article", title: "Artikel" },
    { name: "style", title: "Stijl" },
  ],
  fields: [
    defineField({
      name: "heroImage",
      title: "Hero-afbeelding",
      type: "imageWithAlt",
      group: "hero",
      validation: (Rule) => Rule.required().error("Hero-afbeelding is verplicht."),
    }),
    defineField({
      ...overlayField({ name: "overlayOpacity" }),
      title: "Overlay op afbeelding",
      group: "hero",
      initialValue: "none",
      components: { input: createButtonSelectInput([...OVERLAY_OPTIONS]) },
    }),
    defineField({
      name: "heroHeight",
      title: "Hoogte / uitsnede",
      type: "string",
      group: "hero",
      options: { list: [...HERO_HEIGHT_OPTIONS] },
      initialValue: "md",
      description: "Bepaalt ruimte en crop van de hero (responsive).",
      components: { input: createButtonSelectInput([...HERO_HEIGHT_OPTIONS]) },
    }),
    defineField({
      name: "showInfoCard",
      title: "Toon infokaart",
      type: "boolean",
      group: "infoCard",
      initialValue: true,
    }),
    defineField({
      name: "infoCard",
      title: "Infokaart",
      type: "object",
      group: "infoCard",
      hidden: ({ parent }) => !parent?.showInfoCard,
      fields: [
        defineField({
          name: "travelDates",
          title: "Reisdata (regels)",
          type: "array",
          of: [{ type: "string" }],
          validation: (Rule) => Rule.max(4).error("Maximaal 4 regels."),
          description: "Bijv. datumbereiken; mag per regel of met label in de tekst.",
        }),
        defineField({
          name: "price",
          title: "Reissom / prijs",
          type: "string",
          description: "Bijv. Vanaf €1490,-",
          validation: (Rule) => Rule.max(80),
        }),
        defineField({
          name: "guide",
          title: "Reisleider",
          type: "reference",
          to: [{ type: "person" }],
          description: "Persoon uit de bibliotheek; foto en naam worden op de infokaart getoond.",
        }),
      ],
      validation: (Rule) =>
        Rule.custom((infoCard, ctx) => {
          const doc = ctx.document as { showInfoCard?: boolean } | undefined
          if (!doc?.showInfoCard) return true
          if (!infoCard || typeof infoCard !== "object") return "Vul de infokaart in of zet ‘Toon infokaart’ uit."
          const dates = (infoCard as { travelDates?: string[] }).travelDates
          const price = (infoCard as { price?: string }).price?.trim()
          const hasDates = Array.isArray(dates) && dates.some((d) => d?.trim())
          if (!hasDates && !price) return "Vul minimaal reisdata of prijs in."
          return true
        }),
    }),
    defineField({
      name: "title",
      title: "Titel",
      type: "string",
      group: "article",
      validation: (Rule) => Rule.required().error("Titel is verplicht."),
    }),
    defineField({
      name: "titleSize",
      title: "Titelgrootte",
      type: "string",
      group: "article",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
    }),
    defineField({
      name: "subtitle",
      title: "Ondertitel",
      type: "string",
      group: "article",
    }),
    defineField({
      name: "body",
      title: "Tekst",
      type: "portableText",
      group: "article",
    }),
    defineField({
      name: "ctaEnabled",
      title: "Knop tonen",
      type: "boolean",
      group: "article",
      initialValue: false,
    }),
    defineField({
      name: "ctaLabel",
      title: "Knoplabel",
      type: "string",
      group: "article",
      hidden: ({ parent }) => !parent?.ctaEnabled,
      validation: (Rule) =>
        Rule.custom((v, ctx) => {
          const parent = ctx.parent as { ctaEnabled?: boolean }
          if (parent?.ctaEnabled && !v) return "Vul de knoptekst en URL in."
          return true
        }),
    }),
    defineCtaUrlField({
      name: "ctaUrl",
      title: "Knop-URL",
      group: "article",
      hidden: ({ parent }) => !parent?.ctaEnabled,
      validation: (Rule) =>
        Rule.custom((v, ctx) => {
          const parent = ctx.parent as { ctaEnabled?: boolean }
          if (parent?.ctaEnabled && !v) return "Vul de knoptekst en URL in."
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
    select: { title: "title", media: "heroImage" },
    prepare({ title, media }) {
      return {
        title: title || "Uitgelichte reis",
        subtitle: "Magazine",
        media,
      }
    },
  },
})
export const surfaces = ['page'] as const
