import { defineType, defineField } from "sanity"

export const redirect = defineType({
  name: "redirect",
  title: "Redirect",
  type: "document",
  fields: [
    defineField({
      name: "source",
      title: "From path",
      type: "string",
      description: "Incoming URL path on the storefront, e.g. /old-page",
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (!value || typeof value !== "string") return true
          if (!value.startsWith("/")) return "Path must start with /"
          return true
        }),
    }),
    defineField({
      name: "destinationType",
      title: "Destination type",
      type: "string",
      options: {
        list: [
          { title: "Page", value: "page" },
          { title: "URL or path", value: "url" },
        ],
        layout: "radio",
      },
      initialValue: "url",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "destinationPage",
      title: "Destination page",
      type: "reference",
      to: [{ type: "page" }],
      hidden: ({ parent }) => parent?.destinationType !== "page",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { destinationType?: string } | undefined
          if (parent?.destinationType === "page" && !value) {
            return "Select a destination page"
          }
          return true
        }),
    }),
    defineField({
      name: "destinationUrl",
      title: "Destination URL or path",
      type: "string",
      description: "Internal path (e.g. /new-page) or external URL (e.g. https://…)",
      hidden: ({ parent }) => parent?.destinationType !== "url",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { destinationType?: string } | undefined
          if (parent?.destinationType === "url" && !value?.trim()) {
            return "Enter a destination URL or path"
          }
          return true
        }),
    }),
    defineField({
      name: "permanent",
      title: "Permanent redirect (301)",
      type: "boolean",
      description: "When enabled, browsers and search engines treat this as a permanent move (301). Otherwise a temporary redirect (302) is used.",
      initialValue: true,
    }),
    defineField({
      name: "enabled",
      title: "Enabled",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      source: "source",
      destinationType: "destinationType",
      destinationUrl: "destinationUrl",
      pageTitle: "destinationPage.title",
      pageSlug: "destinationPage.slug.current",
      permanent: "permanent",
      enabled: "enabled",
    },
    prepare({ source, destinationType, destinationUrl, pageTitle, pageSlug, permanent, enabled }) {
      const pagePath =
        pageSlug === "/" ? "/" : pageSlug ? `/${pageSlug}` : undefined
      const destination =
        destinationType === "page"
          ? pagePath || pageTitle || "Page"
          : destinationUrl || "URL"
      const status = enabled === false ? " (disabled)" : ""
      const code = permanent === false ? "302" : "301"
      return {
        title: source || "Untitled redirect",
        subtitle: `${source || "?"} → ${destination} (${code})${status}`,
      }
    },
  },
})
