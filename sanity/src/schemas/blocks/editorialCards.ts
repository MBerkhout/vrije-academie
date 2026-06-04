import { defineType, defineField } from "sanity"
import { ctaUrlFormatMessage } from "../objects/ctaUrl"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { EDITORIAL_TITLE_SIZE_OPTIONS, OVERLAY_OPTIONS, overlayField } from "../objects/mediaEnums"

export const editorialCardsBlock = defineType({
  name: "editorialCardsBlock",
  title: "Redactionele promotiekaarten",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Stijl" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Sectietitel",
      description: 'Bijv. “Redactioneel”. Verschijnt boven de kaarten op het achtergrondbeeld.',
      type: "string",
      group: "content",
    }),
    defineField({
      name: "titleSize",
      title: "Titelgrootte",
      type: "string",
      group: "content",
      options: { list: [...EDITORIAL_TITLE_SIZE_OPTIONS] },
      components: { input: createButtonSelectInput([...EDITORIAL_TITLE_SIZE_OPTIONS]) },
      initialValue: "none",
      validation: (Rule) => Rule.required(),
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "backgroundImage",
      title: "Achtergrondbeeld (volle breedte)",
      type: "imageWithAlt",
      group: "content",
      validation: (Rule) => Rule.required().error("Achtergrondbeeld is verplicht."),
    }),
    defineField({
      ...overlayField({ name: "overlayOpacity", defaultValue: "none" }),
      title: "Overlap (overlay) over achtergrond",
      description: "Licht medium helpt donkere foto’s; bij lichte beelden vaak “none”.",
      group: "content",
      components: { input: createButtonSelectInput([...OVERLAY_OPTIONS]) },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "cards",
      title: "Kaarten",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          preview: {
            select: { title: "title", label: "label", media: "image" },
            prepare({ title, label, media }) {
              return {
                title: title || "Kaart",
                subtitle: label || undefined,
                media,
              }
            },
          },
          fields: [
            defineField({
              name: "label",
              title: "Label (boven titel)",
              description: "Bijv. categorie in hoofdletters: MUZIEK.",
              type: "string",
              validation: (Rule) => Rule.max(80),
            }),
            defineField({
              name: "title",
              title: "Titel",
              type: "string",
              validation: (Rule) => Rule.required().max(120),
            }),
            defineField({
              name: "description",
              title: "Tekst",
              type: "portableText",
            }),
            defineField({
              name: "image",
              title: "Afbeelding (boven tekst)",
              type: "imageWithAlt",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "linkLabel",
              title: "Linktekst",
              description: 'Bijv. “TICKETS” of “Meer informatie”.',
              type: "string",
              validation: (Rule) => Rule.max(60),
            }),
            defineField({
              name: "linkUrl",
              title: "Link-URL",
              type: "string",
              description: "Site path (e.g. /ons-aanbod) or full URL (https://…, mailto:…).",
              validation: (Rule) =>
                Rule.custom((v, ctx) => {
                  const row = ctx.parent as { linkLabel?: string }
                  const hasLabel = Boolean(row?.linkLabel?.trim())
                  const hasUrl = Boolean((v as string)?.trim())
                  if (hasLabel && !hasUrl) return "Vul een URL in als er linktekst staat."
                  if (hasUrl && !hasLabel) return "Vul linktekst in."
                  const format = ctaUrlFormatMessage(v)
                  if (format !== true) return format
                  return true
                }),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(2).max(4).error("Voeg 2 tot 4 kaarten toe."),
    }),
    defineField({
      ...createLayoutField({
        marginTop: "24",
        marginBottom: "24",
        paddingTop: "48",
        paddingBottom: "48",
        width: "full",
        backgroundColor: "none",
      } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title", cards: "cards", media: "backgroundImage" },
    prepare({ title, cards, media }) {
      const n = Array.isArray(cards) ? cards.length : 0
      return {
        title: title || "Redactionele promotiekaarten",
        subtitle: `${n} kaart${n === 1 ? "" : "en"}`,
        media,
      }
    },
  },
})
export const surfaces = ['page'] as const
