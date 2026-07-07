import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { OVERLAY_OPTIONS, TITLE_SIZE_OPTIONS, overlayField } from "../objects/mediaEnums"

const SLIDE_CONTENT_ALIGNMENT = [
  { title: "Left", value: "left" },
  { title: "Center", value: "center" },
] as const

const TOP_PANEL_TITLE_SIZE_OPTIONS = TITLE_SIZE_OPTIONS.filter((o) => o.value !== "h1")

export const heroBlock = defineType({
  name: "heroBlock",
  title: "Hero",
  type: "object",
  groups: [
    { name: "slider", title: "Slider", default: true },
    { name: "topPanel", title: "Top Panel" },
    { name: "newsletter", title: "Newsletter" },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "slides",
      title: "Slides",
      type: "array",
      group: "slider",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "backgroundImage",
              title: "Background Image",
              type: "image",
              validation: (Rule) => Rule.required().error("Achtergrondafbeelding is verplicht."),
            }),
            defineField({
              ...overlayField({ name: "overlayOpacity" }),
              initialValue: "medium",
              components: { input: createButtonSelectInput([...OVERLAY_OPTIONS]) },
            }),
            defineField({
              name: "showLogo",
              title: "Show Logo",
              type: "boolean",
              initialValue: false,
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required().error("Titel is verplicht."),
            }),
            defineField({
              name: "titleSize",
              title: "Title Size",
              type: "string",
              options: { list: [...TITLE_SIZE_OPTIONS] },
              initialValue: "h1",
              components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
            }),
            defineField({
              name: "subtitle",
              title: "Subtitle",
              type: "string",
              description: "Optional short line below the title.",
            }),
            defineCtaUrlField({
              name: "url",
              title: "Link URL",
              description: "If set, the whole slide is clickable and navigates to this address.",
            }),
            defineField({
              name: "contentAlignment",
              title: "Content Alignment",
              type: "string",
              options: { list: [...SLIDE_CONTENT_ALIGNMENT] },
              initialValue: "left",
              components: { input: createButtonSelectInput([...SLIDE_CONTENT_ALIGNMENT]) },
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(1).max(5),
    }),
    defineField({
      name: "autoplay",
      title: "Autoplay",
      type: "boolean",
      group: "slider",
      initialValue: true,
    }),
    defineField({
      name: "autoplayInterval",
      title: "Autoplay Interval (seconds)",
      type: "number",
      group: "slider",
      initialValue: 5,
      validation: (Rule) => Rule.min(2).max(15).error("Voer een waarde in tussen 2 en 15 seconden."),
      hidden: ({ parent }) => !parent?.autoplay,
    }),
    defineField({
      name: "topPanelTitle",
      title: "Title",
      type: "string",
      group: "topPanel",
      validation: (Rule) => Rule.required().error("Titel is verplicht."),
    }),
    defineField({
      name: "topPanelTitleSize",
      title: "Title Size",
      type: "string",
      group: "topPanel",
      options: { list: [...TOP_PANEL_TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TOP_PANEL_TITLE_SIZE_OPTIONS]) },
      hidden: ({ parent }) => !parent?.topPanelTitle,
    }),
    defineField({
      name: "topPanelBody",
      title: "Body",
      type: "portableText",
      group: "topPanel",
    }),
    defineField({
      name: "topPanelImage",
      title: "Image (right of text)",
      type: "image",
      group: "topPanel",
      options: { hotspot: true },
      description: "Optional. Shown to the right of the title and body; fits in the area without cropping.",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "For accessibility. Describe the image for screen readers.",
        }),
      ],
    }),
    defineField({
      name: "topPanelCtaEnabled",
      title: "Show CTA",
      type: "boolean",
      group: "topPanel",
      initialValue: false,
    }),
    defineField({
      name: "topPanelCtaLabel",
      title: "CTA Label",
      type: "string",
      group: "topPanel",
      hidden: ({ parent }) => !parent?.topPanelCtaEnabled,
    }),
    defineCtaUrlField({
      name: "topPanelCtaUrl",
      title: "CTA URL",
      group: "topPanel",
      hidden: ({ parent }) => !parent?.topPanelCtaEnabled,
    }),
    defineCtaUrlField({
      name: "newsletterSignupUrl",
      title: "Aanmeldlink",
      group: "newsletter",
      description: "URL voor de knop Aanmelden (bijv. nieuwsbrief- of inschrijfpagina).",
    }),
    defineField({
      ...createLayoutField({ marginTop: "0", marginBottom: "0" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { slides: "slides" },
    prepare({ slides }) {
      const count = Array.isArray(slides) ? slides.length : 0
      return { title: "Hero", subtitle: `${count} slide(s)` }
    },
  },
})
export const surfaces = ['page'] as const
