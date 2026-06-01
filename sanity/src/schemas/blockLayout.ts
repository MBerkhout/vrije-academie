import { defineType } from "sanity"
import { BlockLayoutInput } from "../components/BlockLayoutInput"

/**
 * Shared layout options for block types.
 * Rendered with a custom input for spacing, width, and background.
 * The placeholder field must remain visible: Sanity skips object inputs when
 * all members are hidden (prepareObjectInputState returns null).
 */
export const blockLayout = defineType({
  name: "blockLayout",
  title: "Layout",
  type: "object",
  fields: [
    {
      name: "placeholder",
      type: "string",
      title: " ",
      hidden: false,
      readOnly: true,
      initialValue: "",
      description: "Required for Sanity to render custom input; BlockLayoutInput replaces this.",
    },
    {
      name: "marginTop",
      type: "string",
      hidden: true,
      initialValue: "0",
    },
    {
      name: "marginTopCustom",
      type: "number",
      hidden: true,
    },
    {
      name: "marginBottom",
      type: "string",
      hidden: true,
      initialValue: "0",
    },
    {
      name: "marginBottomCustom",
      type: "number",
      hidden: true,
    },
    {
      name: "paddingTop",
      type: "string",
      hidden: true,
      initialValue: "0",
    },
    {
      name: "paddingTopCustom",
      type: "number",
      hidden: true,
    },
    {
      name: "paddingBottom",
      type: "string",
      hidden: true,
      initialValue: "0",
    },
    {
      name: "paddingBottomCustom",
      type: "number",
      hidden: true,
    },
    {
      name: "width",
      type: "string",
      hidden: true,
      initialValue: "container",
    },
    {
      name: "backgroundColor",
      type: "string",
      hidden: true,
      initialValue: "none",
    },
    {
      name: "htmlAnchor",
      type: "string",
      title: "Section ID",
      hidden: true,
      description: "In-page link target. Match this value in an In-page navigation block on the same page (no #).",
    },
  ],
  options: {
    collapsible: false,
    columns: 1,
  },
  components: {
    input: BlockLayoutInput,
  },
  initialValue: {
    marginTop: "0",
    marginBottom: "0",
    paddingTop: "0",
    paddingBottom: "0",
    width: "container",
    backgroundColor: "none",
  },
})
