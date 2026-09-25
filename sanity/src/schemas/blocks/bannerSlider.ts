import { defineType, defineField } from "sanity"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { defineSliderFields } from "./sliderFields"

export const bannerSliderBlock = defineType({
  name: "bannerSliderBlock",
  title: "Banner slider",
  type: "object",
  groups: [
    { name: "slider", title: "Slider", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    ...defineSliderFields({
      imageSpec: "bannerSlide",
      group: "slider",
    }),
    defineField({
      ...createLayoutField({
        marginTop: "0",
        marginBottom: "0",
        width: "full",
      } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { slides: "slides" },
    prepare({ slides }) {
      const count = Array.isArray(slides) ? slides.length : 0
      return { title: "Banner slider", subtitle: `${count} slide(s)` }
    },
  },
})

export const surfaces = ["page"] as const
