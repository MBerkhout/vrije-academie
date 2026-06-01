import { defineType, defineField, defineArrayMember } from "sanity"

const menuSubItemFields = [
  defineField({
    name: "label",
    title: "Label",
    type: "string",
  }),
  defineField({
    name: "link",
    title: "Link",
    type: "string",
  }),
  defineField({
    name: "externalLink",
    title: "External Link",
    type: "url",
  }),
  defineField({
    name: "emphasized",
    title: "Highlighted in mobile menu",
    type: "boolean",
    initialValue: false,
  }),
]

export const menu = defineType({
  name: "menu",
  title: "Menu",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Internal name for this menu",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "items",
      title: "Menu Items",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "menuItem",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "link",
              title: "Link",
              type: "string",
              description: "URL path (e.g., /about, /events)",
            }),
            defineField({
              name: "externalLink",
              title: "External Link",
              type: "url",
              description: "Full URL for external links",
            }),
            defineField({
              name: "emphasized",
              title: "Highlighted in mobile menu",
              type: "boolean",
              description:
                "Optional accent background (e.g. gift card) in the full-screen nav",
              initialValue: false,
            }),
            defineField({
              name: "children",
              title: "Submenu Items",
              type: "array",
              of: [
                defineArrayMember({
                  type: "object",
                  name: "menuSubItem",
                  fields: menuSubItemFields,
                }),
              ],
            }),
          ],
          preview: {
            select: {
              title: "label",
              link: "link",
              externalLink: "externalLink",
            },
            prepare({ title, link, externalLink }) {
              return {
                title: title || "Untitled",
                subtitle: externalLink || link || "No link",
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
    prepare({ title }) {
      return {
        title: title || "Untitled Menu",
      }
    },
  },
})
