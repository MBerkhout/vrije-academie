import { defineType, defineField } from "sanity"

/**
 * Image field with required alt text for accessibility.
 */
export const imageWithAlt = defineType({
  name: "imageWithAlt",
  type: "image",
  title: "Image",
  options: {
    hotspot: true,
    accept: "image/jpeg,image/png,image/webp",
  },
  fields: [
    defineField({
      name: "alt",
      title: "Alt Text",
      type: "string",
      description: "Required for accessibility. Describe the image for screen readers.",
      validation: (Rule) => Rule.required().error("Alt tekst is verplicht voor afbeeldingen."),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
      description: "Optional caption shown below the image.",
    }),
  ],
})
