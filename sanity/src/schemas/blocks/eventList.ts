import { defineType, defineField } from "sanity"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { createLayoutField, type BlockLayoutDefaults } from "../../lib/blockFields"

const EVENT_TYPE_FILTER_OPTIONS = [
  { title: "All", value: "all" },
  { title: "Online Only", value: "online" },
  { title: "Offline Only", value: "offline" },
] as const

export const eventList = defineType({
  name: "eventList",
  title: "Event List",
  type: "object",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "style", title: "Style" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Section Title",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "category",
      title: "Filter by Category",
      type: "string",
      group: "content",
      description: "Optional: Filter events by category (e.g., 'Collegereeksen', 'Workshops')",
    }),
    defineField({
      name: "eventType",
      title: "Filter by Type",
      type: "string",
      group: "content",
      options: { list: [...EVENT_TYPE_FILTER_OPTIONS] },
      initialValue: "all",
      components: { input: createButtonSelectInput([...EVENT_TYPE_FILTER_OPTIONS]) },
    }),
    defineField({
      name: "limit",
      title: "Limit",
      type: "number",
      group: "content",
      description: "Maximum number of events to display",
      initialValue: 10,
    }),
    defineField({
      name: "showPastEvents",
      title: "Show Past Events",
      type: "boolean",
      group: "content",
      initialValue: false,
    }),
    defineField({
      ...createLayoutField({ marginTop: "24", marginBottom: "24" } as BlockLayoutDefaults),
      group: "style",
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      eventType: "eventType",
    },
    prepare({ title, category, eventType }) {
      const filters = []
      if (category) filters.push(`Category: ${category}`)
      if (eventType && eventType !== "all") filters.push(`Type: ${eventType}`)
      return {
        title: title || "Event List",
        subtitle: filters.length > 0 ? filters.join(", ") : "All events",
      }
    },
  },
})
export const surfaces = ['page'] as const
