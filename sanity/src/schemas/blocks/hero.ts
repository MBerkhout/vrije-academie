import { defineType, defineField } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { defineImageField } from "../objects/imageField"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { defineSliderFields } from "./sliderFields"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"

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
    ...defineSliderFields({
      imageSpec: "heroSlide",
      group: "slider",
      extraSlideFields: [
        defineField({
          name: "showLogo",
          title: "Show Logo",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "titleSize",
          title: "Title Size",
          type: "string",
          options: { list: [...TITLE_SIZE_OPTIONS] },
          initialValue: "h1",
          components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
        }),
      ],
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
    defineImageField({
      name: "topPanelImage",
      title: "Image (right of text)",
      group: "topPanel",
      spec: "heroTopPanel",
      extraDescription: "Optioneel. Rechts van titel en body; past in het vlak zonder bijsnijden.",
      options: { hotspot: true },
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
    defineField({
      name: "newsletterEnabled",
      title: "Show newsletter",
      type: "boolean",
      group: "newsletter",
      initialValue: true,
      description:
        "Turn off to hide the Meld je aan card. Existing heroes keep showing it until this is turned off.",
    }),
    defineCtaUrlField({
      name: "newsletterSignupUrl",
      title: "Aanmeldlink",
      group: "newsletter",
      description: "URL voor de knop Aanmelden (bijv. nieuwsbrief- of inschrijfpagina).",
      hidden: ({ parent }) => parent?.newsletterEnabled === false,
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
