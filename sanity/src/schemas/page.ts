import { defineType, defineField } from "sanity"
import { DocumentIcon } from "@sanity/icons"
import { blocksForSurface } from "./blocks/registry"
import { VATHUIS_PATH_SEGMENT } from "../constants/storefront-paths"
import { pageSlugValidationMessage } from "../lib/page-slug-validation"

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  icon: DocumentIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "isVaThuis",
      title: "VA Thuis page",
      type: "boolean",
      description: `When enabled, the slug must start with "${VATHUIS_PATH_SEGMENT}" and the page is shown under /${VATHUIS_PATH_SEGMENT}/….`,
      initialValue: false,
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      description: `VA Thuis pages: use "${VATHUIS_PATH_SEGMENT}" for the landing or "${VATHUIS_PATH_SEGMENT}/…" for sub-pages.`,
      validation: (Rule) =>
        Rule.required().custom((slug, context) => {
          const current = slug?.current
          const isVaThuis = (context.document as { isVaThuis?: boolean } | undefined)?.isVaThuis
          return pageSlugValidationMessage(current, isVaThuis)
        }),
    }),
    defineField({
      name: "blocks",
      title: "Content Blocks",
      type: "array",
      of: blocksForSurface("page"),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      slug: "slug.current",
      isVaThuis: "isVaThuis",
    },
    prepare({ title, slug, isVaThuis }) {
      const pathLabel =
        !slug ? "No slug" : slug === "/" ? "/" : `/${slug}`
      return {
        title: title || "Untitled",
        subtitle: isVaThuis ? `VA Thuis · ${pathLabel}` : pathLabel,
      }
    },
  },
})
