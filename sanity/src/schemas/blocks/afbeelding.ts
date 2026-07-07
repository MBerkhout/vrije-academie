import { defineType, defineField } from "sanity"
import { ImageIcon, VideoIcon } from "@sanity/icons"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import {
  widthField,
  aspectRatioField,
  WIDTH_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  youtubeUrlRegex,
} from "../objects/mediaEnums"

const MEDIA_TYPE_OPTIONS = [
  { title: "Image", value: "image" },
  { title: "YouTube Video", value: "youtube" },
] as const

export const afbeeldingBlock = defineType({
  name: "afbeeldingBlock",
  title: "Afbeelding",
  type: "object",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "mediaType",
      title: "Media Type",
      type: "string",
      group: "content",
      options: { list: [...MEDIA_TYPE_OPTIONS] },
      initialValue: "image",
      components: { input: createButtonSelectInput([...MEDIA_TYPE_OPTIONS]) },
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      group: "content",
      options: {
        hotspot: true,
        accept: "image/jpeg,image/png,image/webp",
      },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Required when media type is Image.",
          validation: (Rule) =>
            Rule.custom((alt, ctx) => {
              const doc = (ctx.document ?? ctx.parent) as { mediaType?: string }
              if (doc?.mediaType === "image" && !alt) return "Alt tekst is verplicht voor afbeeldingen."
              return true
            }),
        }),
      ],
      hidden: ({ document, parent }) => {
        const mediaType = parent?.mediaType ?? document?.mediaType
        return mediaType === "youtube"
      },
      validation: (Rule) =>
        Rule.custom((image, ctx) => {
          const doc = (ctx.document ?? ctx.parent) as { mediaType?: string }
          if (doc?.mediaType === "image" && !image) return "Selecteer een afbeelding of kies YouTube video als mediatype."
          return true
        }),
    }),
    defineField({
      name: "youtubeUrl",
      title: "YouTube URL",
      type: "url",
      group: "content",
      hidden: ({ document, parent }) => {
        const mediaType = parent?.mediaType ?? document?.mediaType
        return mediaType !== "youtube"
      },
      validation: (Rule) =>
        Rule.custom((url, ctx) => {
          const doc = (ctx.document ?? ctx.parent) as { mediaType?: string }
          if (doc?.mediaType !== "youtube") return true
          if (!url) return "Voer een geldige YouTube URL in."
          if (!youtubeUrlRegex.test(url)) return "Voer een geldige YouTube URL in."
          return true
        }),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
      group: "content",
    }),
    defineField({
      ...widthField(),
      group: "content",
      components: { input: createButtonSelectInput([...WIDTH_OPTIONS]) },
    }),
    defineField({
      ...aspectRatioField(),
      group: "content",
      components: { input: createButtonSelectInput([...ASPECT_RATIO_OPTIONS]) },
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: {
      mediaType: "mediaType",
      caption: "caption",
      image: "image",
      placeholderImage: "placeholderImage",
    },
    prepare({ mediaType, caption, image, placeholderImage }) {
      const thumbnail = image ?? (mediaType === "youtube" ? placeholderImage : null)
      return {
        title: mediaType === "youtube" ? "YouTube Video" : "Image",
        subtitle: caption || undefined,
        media: thumbnail ?? (mediaType === "youtube" ? VideoIcon : ImageIcon),
      }
    },
  },
})
export const surfaces = ['page', 'pdp'] as const
