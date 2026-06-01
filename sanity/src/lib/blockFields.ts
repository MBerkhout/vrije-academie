import { defineField } from "sanity"
import { blockLayout } from "../schemas/blockLayout"

const DEFAULT_LAYOUT = {
  marginTop: "0",
  marginBottom: "0",
  paddingTop: "0",
  paddingBottom: "0",
  width: "container",
  backgroundColor: "none",
}

/** Default layout values - block types can override via createLayoutField(defaults) */
export type BlockLayoutDefaults = Partial<Record<keyof typeof DEFAULT_LAYOUT, string>>

/**
 * Shared layout field for block types.
 * Uses a custom input with spacing buttons, width illustrations, and background options.
 * Pass blockDefaults to define per-block default spacing (e.g. eventList with more margin).
 */
export function createLayoutField(blockDefaults?: BlockLayoutDefaults) {
  return defineField({
    name: "layout",
    title: "Layout",
    type: "blockLayout",
    initialValue: blockDefaults ? { ...DEFAULT_LAYOUT, ...blockDefaults } : DEFAULT_LAYOUT,
    options: {
      collapsible: true,
      collapsed: false,
    },
  })
}

/** Layout field with default spacing (0 margin/padding, container width) */
export const layoutField = createLayoutField()

/** Reusable block container defaults - all blocks use these via createLayoutField() */
export const BLOCK_CONTAINER_DEFAULTS = {
  marginTop: "0",
  marginBottom: "0",
  paddingTop: "0",
  paddingBottom: "0",
  width: "container",
  backgroundColor: "none",
} as const
