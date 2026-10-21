import { defineType, defineField } from "sanity"
import { VideoIcon } from "@sanity/icons"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { defineImageField } from "../objects/imageField"
import {
  widthField,
  aspectRatioField,
  WIDTH_OPTIONS,
  ASPECT_RATIO_OPTIONS,
} from "../objects/mediaEnums"

export const videoBlock = defineType({
  name: "videoBlock",
  title: "Video",
  type: "object",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "videoFile",
      title: "Video (MP4)",
      type: "file",
      group: "content",
      options: {
        accept: "video/mp4",
      },
      validation: (Rule) => Rule.required().error("Upload een MP4-bestand."),
    }),
    defineImageField({
      name: "posterImage",
      title: "Poster Image",
      group: "content",
      spec: "blockImageAspectRatio",
      extraDescription: "Optioneel: getoond vóór afspelen en bij voorkeur voor minder beweging. Kies beeldverhouding hieronder.",
      options: {
        hotspot: true,
        accept: "image/jpeg,image/png,image/webp",
      },
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
      caption: "caption",
      posterImage: "posterImage",
    },
    prepare({ caption, posterImage }) {
      return {
        title: "Video (MP4)",
        subtitle: caption || undefined,
        media: posterImage ?? VideoIcon,
      }
    },
  },
})

export const surfaces = ["page", "pdp"] as const
