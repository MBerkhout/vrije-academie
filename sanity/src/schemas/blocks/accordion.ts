import { defineType, defineField } from "sanity"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"

export const accordionBlock = defineType({
  name: "accordionBlock",
  title: "FAQ / Accordion",
  type: "object",
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
    }),
    defineField({
      name: "titleSize",
      title: "Title size",
      type: "string",
      group: "content",
      fieldset: "heading",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h3",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "items",
      title: "Questions & Answers",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "question",
              title: "Question",
              type: "string",
              validation: (Rule) => Rule.required().max(120),
            }),
            defineField({
              name: "answer",
              title: "Answer",
              type: "portableText",
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { question: "question" },
            prepare({ question }) {
              return {
                title: question || "Question",
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "allowMultipleOpen",
      title: "Allow Multiple Open",
      type: "boolean",
      group: "content",
      description: "When off, opening one item closes the others.",
      initialValue: false,
    }),
    defineField({
      name: "enableStructuredData",
      title: "FAQ structured data",
      type: "boolean",
      group: "content",
      description: "When enabled, emits FAQPage JSON-LD for this block on the storefront.",
      initialValue: true,
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title", items: "items" },
    prepare({ title, items }) {
      const count = Array.isArray(items) ? items.length : 0
      return {
        title: title || "FAQ / Accordion",
        subtitle: `${count} item(s)`,
      }
    },
  },
})
export const surfaces = ['page', 'pdp'] as const
