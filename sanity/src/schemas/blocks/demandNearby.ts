import { defineType, defineField } from "sanity"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"

export const demandNearbyBlock = defineType({
  name: "demandNearbyBlock",
  title: "Demand Nearby",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fieldsets: [
    {
      name: "heading",
      title: "Section title",
      options: { collapsible: true, collapsed: false },
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Section Title",
      type: "string",
      group: "content",
      fieldset: "heading",
      initialValue: "Bekijk het aanbod bij jou in de buurt",
    }),
    defineField({
      name: "titleSize",
      title: "Title size",
      type: "string",
      group: "content",
      fieldset: "heading",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "introText",
      title: "Intro Text",
      type: "portableText",
      group: "content",
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare({ title }) {
      return { title: title || "Demand Nearby", subtitle: "Postcode search" }
    },
  },
})
export const surfaces = ['page'] as const
