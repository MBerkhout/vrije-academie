import { defineType, defineField } from "sanity"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"
import { TITLE_SIZE_OPTIONS } from "../objects/mediaEnums"
import { NESTED_BLOCK_TYPES } from "./nestedBlockTypes"

const TABS_WIDTH_OPTIONS = [
  { title: "Normal", value: "normal" },
  { title: "Wide", value: "wide" },
] as const

const TABS_NAV_POSITION_OPTIONS = [
  { title: "Top (row above content)", value: "top" },
  { title: "Left (vertical menu)", value: "left" },
] as const

const TABS_INTERACTION_MODE_OPTIONS = [
  { title: "Tabs (content in this block)", value: "tabs" },
  { title: "In-page navigation (links to #sections)", value: "inPageNav" },
] as const

export const tabsBlock = defineType({
  name: "tabsBlock",
  title: "Tabs",
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
      name: "interactionMode",
      title: "Mode",
      type: "string",
      group: "content",
      description:
        "Tabs: content in this block. In-page: links and (with left menu) optional extra blocks beside the list.",
      options: { list: [...TABS_INTERACTION_MODE_OPTIONS] },
      initialValue: "tabs",
      components: { input: createButtonSelectInput([...TABS_INTERACTION_MODE_OPTIONS]) },
    }),
    defineField({
      name: "tabs",
      title: "Tabs",
      type: "array",
      group: "content",
      hidden: ({ parent }) => parent?.interactionMode === "inPageNav",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Tab Label",
              type: "string",
              validation: (Rule) =>
                Rule.required()
                  .max(40)
                  .error("Tablabel is verplicht. Max 40 karakters."),
            }),
            defineField({
              name: "blocks",
              title: "Content",
              type: "array",
              validation: (Rule) => Rule.required().min(1).error("Voeg minimaal één block toe."),
              of: [...NESTED_BLOCK_TYPES],
            }),
          ],
          preview: {
            select: { label: "label" },
            prepare({ label }) {
              return { title: label || "Tab" }
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.custom((val, { parent }) => {
          if ((parent as { interactionMode?: string })?.interactionMode === "inPageNav")
            return true
          if (!val || !Array.isArray(val) || val.length < 2) {
            return "Voeg minimaal 2 tabbladen toe. Maximaal 8."
          }
          if (val.length > 8) return "Maximaal 8 tabbladen."
          return true
        }),
    }),
    defineField({
      name: "inPageNavItems",
      title: "Navigation links",
      type: "array",
      group: "content",
      description:
        "Per item: same-page section, or a path/URL to another page (see fields below).",
      hidden: ({ parent }) => parent?.interactionMode !== "inPageNav",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule) =>
                Rule.required()
                  .max(60)
                  .error("Label is verplicht. Max 60 karakters."),
            }),
            defineField({
              name: "url",
              title: "Page or URL (optional)",
              type: "string",
              description:
                "Another page, e.g. /over-ons/docenten, or https:// or mailto:. Leave empty to link to a section on this page (set Section ID below).",
              validation: (Rule) =>
                Rule.custom((val, { parent }) => {
                  const p = parent as { url?: string; htmlAnchor?: string }
                  const a = p?.htmlAnchor?.trim()
                  if (a) return true
                  const u = val?.trim()
                  if (!u) {
                    return "Vul URL in, of een sectie-ID hieronder."
                  }
                  if (u.length > 2000) return "URL te lang."
                  return true
                }),
            }),
            defineField({
              name: "htmlAnchor",
              title: "Section ID (same page only)",
              type: "string",
              description:
                "If URL is empty: match Section ID in Style → Layout (no #). Ignored if URL is set.",
              validation: (Rule) =>
                Rule.custom((val, { parent }) => {
                  const p = parent as { url?: string; htmlAnchor?: string }
                  const u = p?.url?.trim()
                  if (u) return true
                  if (!val || !String(val).trim()) {
                    return "Vul sectie-ID in, of een URL hierboven."
                  }
                  if (String(val).length > 80) return "Max 80 karakters."
                  return true
                }),
            }),
          ],
          preview: {
            select: { label: "label", htmlAnchor: "htmlAnchor", url: "url" },
            prepare({ label, htmlAnchor, url }: { label?: string; htmlAnchor?: string; url?: string }) {
              const u = url?.trim()
              const sub = u ? (u.length > 48 ? `${u.slice(0, 46)}…` : u) : htmlAnchor ? `#${htmlAnchor}` : ""
              return { title: label || "Link", subtitle: sub }
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.custom((val, { parent }) => {
          if ((parent as { interactionMode?: string })?.interactionMode !== "inPageNav")
            return true
          if (!val || !Array.isArray(val) || val.length < 2) {
            return "Voeg minimaal 2 navigatielinks toe."
          }
          if (val.length > 20) return "Maximaal 20 links."
          return true
        }),
    }),
    defineField({
      name: "inPageNavContent",
      title: "Content beside navigation",
      type: "array",
      group: "content",
      of: [...NESTED_BLOCK_TYPES],
      hidden: ({ parent }) =>
        parent?.interactionMode !== "inPageNav" || parent?.navPosition !== "left",
    }),
    defineField({
      name: "width",
      title: "Width",
      type: "string",
      group: "content",
      options: { list: [...TABS_WIDTH_OPTIONS] },
      initialValue: "normal",
      components: { input: createButtonSelectInput([...TABS_WIDTH_OPTIONS]) },
    }),
    defineField({
      name: "navPosition",
      title: "Tab labels",
      type: "string",
      group: "content",
      description: "Place tab links above the content, or in a column on the left (vertical menu).",
      options: { list: [...TABS_NAV_POSITION_OPTIONS] },
      initialValue: "top",
      components: { input: createButtonSelectInput([...TABS_NAV_POSITION_OPTIONS]) },
    }),
    defineField({
      name: "anchorNavigation",
      title: "Anchor Navigation",
      type: "boolean",
      group: "content",
      description: "Enable #hash URLs to open specific tabs (tabs mode only).",
      initialValue: true,
      hidden: ({ parent }) => parent?.interactionMode === "inPageNav",
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: { title: "title", tabs: "tabs", interactionMode: "interactionMode", inPageNavItems: "inPageNavItems" },
    prepare({ title, tabs, interactionMode, inPageNavItems }) {
      const count =
        interactionMode === "inPageNav"
          ? (Array.isArray(inPageNavItems) ? inPageNavItems.length : 0)
          : Array.isArray(tabs)
            ? tabs.length
            : 0
      const mode = interactionMode === "inPageNav" ? "In-page nav" : "Tabs"
      return {
        title: title || "Tabs",
        subtitle: `${mode} · ${count} item(s)`,
      }
    },
  },
})
export const surfaces = ['page', 'pdp'] as const
