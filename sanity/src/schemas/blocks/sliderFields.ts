import { defineField, type FieldDefinition } from "sanity"
import { defineCtaUrlField } from "../objects/ctaUrl"
import { defineImageField } from "../objects/imageField"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { OVERLAY_OPTIONS, overlayField } from "../objects/mediaEnums"
import type { ImageSpecKey } from "../objects/imageSpecs"

const SLIDE_CONTENT_ALIGNMENT = [
  { title: "Left", value: "left" },
  { title: "Center", value: "center" },
] as const

/** Slide object fields rendered by ImageSlideStage on the frontend. */
export function buildRenderedSlideFields(imageSpec: ImageSpecKey): FieldDefinition[] {
  return [
    defineImageField({
      name: "backgroundImage",
      title: "Background Image",
      spec: imageSpec,
      validation: (Rule) => Rule.required().error("Achtergrondafbeelding is verplicht."),
    }),
    defineField({
      ...overlayField({ name: "overlayOpacity" }),
      initialValue: "medium",
      components: { input: createButtonSelectInput([...OVERLAY_OPTIONS]) },
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().error("Titel is verplicht."),
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
  ]
}

/** Slides array plus autoplay fields shared by hero and banner slider blocks. */
export function defineSliderFields(options: {
  imageSpec: ImageSpecKey
  group?: string
  extraSlideFields?: FieldDefinition[]
}): FieldDefinition[] {
  const { imageSpec, group, extraSlideFields = [] } = options

  return [
    defineField({
      name: "slides",
      title: "Slides",
      type: "array",
      group,
      of: [
        {
          type: "object",
          fields: [...buildRenderedSlideFields(imageSpec), ...extraSlideFields],
        },
      ],
      validation: (Rule) => Rule.required().min(1).max(5),
    }),
    defineField({
      name: "autoplay",
      title: "Autoplay",
      type: "boolean",
      group,
      initialValue: true,
    }),
    defineField({
      name: "autoplayInterval",
      title: "Autoplay Interval (seconds)",
      type: "number",
      group,
      initialValue: 5,
      validation: (Rule) => Rule.min(2).max(15).error("Voer een waarde in tussen 2 en 15 seconden."),
      hidden: ({ parent }) => !parent?.autoplay,
    }),
  ]
}
