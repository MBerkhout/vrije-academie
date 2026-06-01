import { defineType, defineField } from "sanity"
import { createButtonNumberSelectInput, createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"

const NAVIGATION_STYLE_OPTIONS = [
  { title: "Arrows", value: "arrows" },
  { title: "Dots", value: "dots" },
  { title: "Both", value: "both" },
] as const

const STAR_RATING_BUTTONS = [1, 2, 3, 4, 5].map((n) => ({ title: String(n), value: n }))

export const reviewBlock = defineType({
  name: "reviewBlock",
  title: "Review",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "titleSize",
      title: "Title Size",
      type: "string",
      group: "content",
      options: { list: [...TITLE_SIZE_OPTIONS] },
      initialValue: "h2",
      components: { input: createButtonSelectInput([...TITLE_SIZE_OPTIONS]) },
      hidden: ({ parent }) => !parent?.title,
    }),
    defineField({
      name: "ratingDisplay",
      title: "Show Rating",
      type: "boolean",
      group: "content",
      initialValue: false,
    }),
    defineField({
      name: "ratingValue",
      title: "Rating Value",
      type: "number",
      group: "content",
      description: "0.0 - 10.0",
      validation: (Rule) =>
        Rule.custom((v, ctx) => {
          const doc = ctx.document as { ratingDisplay?: boolean }
          if (doc?.ratingDisplay && (v == null || v === "")) return "Vul de beoordelingswaarde in."
          if (doc?.ratingDisplay && (v < 0 || v > 10)) return "Voer een waarde in tussen 0 en 10."
          return true
        }),
      hidden: ({ parent }) => !parent?.ratingDisplay,
    }),
    defineField({
      name: "ratingLabel",
      title: "Rating Label",
      type: "string",
      group: "content",
      validation: (Rule) => Rule.max(60),
      hidden: ({ parent }) => !parent?.ratingDisplay,
    }),
    defineField({
      name: "reviews",
      title: "Reviews",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "quote",
              title: "Quote",
              type: "text",
              validation: (Rule) =>
                Rule.required()
                  .max(280)
                  .error("Citaat is verplicht. Max 280 karakters."),
            }),
            defineField({
              name: "authorName",
              title: "Author Name",
              type: "string",
              validation: (Rule) =>
                Rule.required()
                  .max(60)
                  .error("Auteursnaam is verplicht. Max 60 karakters."),
            }),
            defineField({
              name: "authorSubtitle",
              title: "Author Subtitle",
              type: "string",
              validation: (Rule) => Rule.max(80),
            }),
            defineField({
              name: "starRating",
              title: "Star Rating",
              type: "number",
              options: { list: [1, 2, 3, 4, 5] },
              components: { input: createButtonNumberSelectInput(STAR_RATING_BUTTONS) },
              validation: (Rule) => Rule.min(1).max(5),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(1).max(10),
    }),
    defineField({
      name: "navigationStyle",
      title: "Navigation Style",
      type: "string",
      group: "content",
      options: { list: [...NAVIGATION_STYLE_OPTIONS] },
      initialValue: "arrows",
      components: { input: createButtonSelectInput([...NAVIGATION_STYLE_OPTIONS]) },
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title", reviews: "reviews" },
    prepare({ title, reviews }) {
      const count = Array.isArray(reviews) ? reviews.length : 0
      return { title: title || "Review", subtitle: `${count} review(s)` }
    },
  },
})
export const surfaces = ['page'] as const
