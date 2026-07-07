import { defineType, defineField } from "sanity"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { portableText } from "../objects/portableText"
import { TITLE_SIZE_OPTIONS, TITLE_ALIGNMENT_OPTIONS } from "../objects/mediaEnums"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"

export const textBlock = defineType({
  name: "textBlock",
  title: "Text",
  type: "object",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Block style" },
  ],
  fieldsets: [
    {
      name: "heading",
      title: "Optional heading",
      options: { collapsible: true, collapsed: true },
    },
    {
      name: "appearance",
      title: "Content appearance",
      options: { collapsible: true, collapsed: false },
    },
  ],
  fields: [
    defineField({
      name: "content",
      title: "Content",
      type: "portableText",
      group: "content",
      description: "Main body text. Supports bold, italics, lists and links.",
    }),
    defineField({
      name: "title",
      title: "Heading",
      type: "string",
      group: "content",
      fieldset: "heading",
      description: "Add an optional heading above the content.",
    }),
    defineField({
      name: "titleSize",
      title: "Heading size",
      type: "string",
      group: "content",
      fieldset: "heading",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const title = (context.parent as { title?: string } | undefined)?.title?.trim()
          if (!title) return true
          return value ? true : "Required when heading is set"
        }),
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "titleAlignment",
      title: "Heading alignment",
      type: "string",
      group: "content",
      fieldset: "heading",
      options: { list: [...TITLE_ALIGNMENT_OPTIONS] },
      initialValue: "left",
      components: { input: createButtonSelectInput([...TITLE_ALIGNMENT_OPTIONS]) },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const title = (context.parent as { title?: string } | undefined)?.title?.trim()
          if (!title) return true
          return value ? true : "Required when heading is set"
        }),
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "width",
      title: "Content width",
      type: "string",
      group: "content",
      fieldset: "appearance",
      options: {
        list: [
          { title: "Narrow", value: "narrow" },
          { title: "Normal", value: "normal" },
          { title: "Wide", value: "wide" },
        ],
      },
      initialValue: "normal",
      components: {
        input: createButtonSelectInput([
          { title: "Narrow", value: "narrow" },
          { title: "Normal", value: "normal" },
          { title: "Wide", value: "wide" },
        ]),
      },
      validation: (Rule) => Rule.required(),
      description: "Width of the text content within the block.",
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title", content: "content" },
    prepare({ title, content }) {
      const firstBlock = Array.isArray(content) ? content[0] : null
      const text = firstBlock && "children" in firstBlock
        ? (firstBlock.children as { text?: string }[]).map((c) => c.text).join("")
        : ""
      return {
        title: title || "Text",
        subtitle: text ? text.slice(0, 50) + (text.length > 50 ? "…" : "") : "No content",
      }
    },
  },
})
export const surfaces = ['page', 'pdp'] as const
