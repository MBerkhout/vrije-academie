import { defineType, defineField } from "sanity"

/**
 * Internal or external link for CTAs and navigation.
 */
export const linkObject = defineType({
  name: "link",
  type: "object",
  title: "Link",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "internalRef",
      title: "Internal Page",
      type: "reference",
      to: [{ type: "page" }],
      hidden: ({ parent }) => !!parent?.externalUrl,
    }),
    defineField({
      name: "externalUrl",
      title: "External URL",
      type: "url",
      hidden: ({ parent }) => !!parent?.internalRef,
    }),
  ],
  preview: {
    select: { label: "label" },
    prepare({ label }) {
      return { title: label || "Link" }
    },
  },
})
