import { defineType, defineField } from "sanity"

export const usp = defineType({
  name: "usp",
  title: "USP",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().max(30),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "portableText",
      description: "Max 120 chars recommended",
    }),
    defineField({
      name: "linkEnabled",
      title: "Show Link",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "linkLabel",
      title: "Link Label",
      type: "string",
      hidden: ({ parent }) => !parent?.linkEnabled,
    }),
    defineField({
      name: "linkUrl",
      title: "Link URL",
      type: "url",
      hidden: ({ parent }) => !parent?.linkEnabled,
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare({ title }) {
      return { title: title || "USP" }
    },
  },
})
