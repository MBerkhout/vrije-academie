import { defineType, defineArrayMember } from "sanity"
import { buttonAnnotation } from "./buttonAnnotation"

/**
 * Portable text schema with supported marks and inline button annotation.
 * Used for WYSIWYG content in Text block, Tabs, Form intro, etc.
 */
export const portableText = defineType({
  name: "portableText",
  title: "Rich Text",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      marks: {
        annotations: [
          { type: "link" },
          {
            type: "inlineButton",
            title: "Inline Button",
          },
        ],
      },
    }),
  ],
})
