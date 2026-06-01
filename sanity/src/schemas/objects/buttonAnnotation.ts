import { defineType, defineField } from "sanity"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { InlineButtonAnnotation } from "../../components/InlineButtonAnnotation"

const INLINE_BUTTON_TYPE_OPTIONS = [
  { title: "Primary", value: "primary" },
  { title: "Secondary", value: "secondary" },
  { title: "Text Link", value: "textLink" },
] as const

/**
 * Inline button annotation for use within portable text.
 * Renders as Primary, Secondary, or Text link per Asana Text block spec.
 */
export const buttonAnnotation = defineType({
  name: "inlineButton",
  type: "object",
  title: "Inline Button",
  components: {
    annotation: InlineButtonAnnotation,
  },
  fields: [
    defineField({
      name: "buttonType",
      title: "Button Type",
      type: "string",
      options: { list: [...INLINE_BUTTON_TYPE_OPTIONS] },
      components: { input: createButtonSelectInput([...INLINE_BUTTON_TYPE_OPTIONS]) },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      validation: (Rule) => Rule.required().error("Label is required for inline buttons."),
    }),
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      validation: (Rule) =>
        Rule.required().uri({ scheme: ["http", "https", "mailto"] }).error("URL is required for inline buttons."),
    }),
  ],
})
