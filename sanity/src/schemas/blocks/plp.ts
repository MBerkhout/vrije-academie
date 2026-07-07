import { defineType, defineField, defineArrayMember } from "sanity"
import { PLP_BASE_PATH } from "../../constants/storefront-paths"
import { defineCtaUrlField } from "../objects/ctaUrl"

/**
 * PLP editorial surface (banner, intro, tabs) for `/ons-aanbod`.
 * Lives on a Page (see `pageOnsAanbod`); page-level `seo` covers meta/OG.
 */
export const plpBlock = defineType({
  name: "plpBlock",
  title: "PLP (Ons aanbod)",
  type: "object",
  fields: [
    defineField({
      name: "banner",
      title: "Promotional banner",
      type: "object",
      description: "Optional full-width banner shown below the breadcrumbs.",
      fields: [
        defineField({ name: "enabled", title: "Show banner", type: "boolean", initialValue: false }),
        defineField({ name: "title", title: "Title", type: "string" }),
        defineField({ name: "subtitle", title: "Subtitle", type: "text", rows: 2 }),
        defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true } }),
        defineField({ name: "ctaLabel", title: "CTA label", type: "string" }),
        defineCtaUrlField({ name: "ctaUrl", title: "CTA URL" }),
      ],
    }),
    defineField({
      name: "intro",
      title: "Intro text",
      type: "array",
      description: "Optional WYSIWYG intro shown below the page title.",
      of: [
        defineArrayMember({
          type: "block",
          marks: {
            annotations: [{ type: "link" }],
          },
        }),
      ],
    }),
    defineField({
      name: "tabs",
      title: "Page tabs",
      type: "array",
      description: "Tabs shown below the intro (e.g. Ons aanbod / Agenda).",
      of: [
        defineArrayMember({
          type: "object",
          name: "plpTab",
          fields: [
            defineField({ name: "label", title: "Label", type: "string", validation: (R) => R.required() }),
            defineField({ name: "href", title: "URL", type: "string", validation: (R) => R.required() }),
          ],
          preview: {
            select: { label: "label", href: "href" },
            prepare({ label, href }) {
              return { title: label || "Tab", subtitle: href || "" }
            },
          },
        }),
      ],
      initialValue: [
        { _key: "aanbod", label: "Ons aanbod", href: PLP_BASE_PATH },
        { _key: "agenda", label: "Agenda", href: "/agenda" },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "PLP (Ons aanbod)" }
    },
  },
})

export const surfaces = ["page"] as const
