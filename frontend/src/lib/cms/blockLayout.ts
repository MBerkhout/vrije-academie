/**
 * Block container layout utilities.
 * Maps Sanity layout field values to Tailwind classes and inline styles.
 */

import { stegaClean } from 'next-sanity'
import { anchorIdFromString } from '@/lib/anchor-id'

/** Clean stega-encoded value for use in logic (titleSize, titleAlignment, etc.). */
export function cleanBlockValue<T = string>(value: T | undefined): T | undefined {
  if (value == null) return undefined
  return stegaClean(value) as T
}

/** Resolve title size to HTML heading tag. Uses stegaClean so Draft Mode encoding doesn't break comparisons. */
export function getTitleTag(titleSize: string | undefined): 'h1' | 'h2' | 'h3' | 'h4' {
  const size = cleanBlockValue(titleSize)
  return (size === 'h1' ? 'h1' : size === 'h3' ? 'h3' : size === 'h4' ? 'h4' : 'h2') as 'h1' | 'h2' | 'h3' | 'h4'
}

const TITLE_SIZE_CLASS: Record<string, string> = {
  h1: 'text-3xl',
  h2: 'text-2xl',
  h3: 'text-xl',
  h4: 'text-lg',
}

/** Tailwind size classes for h1–h4 headings. Matches PortableText hierarchy. */
export function getTitleSizeClass(titleSize: string | undefined): string {
  const size = cleanBlockValue(titleSize)
  return TITLE_SIZE_CLASS[size ?? 'h2'] ?? TITLE_SIZE_CLASS.h2
}

export type BlockLayout = {
  marginTop: string
  marginTopCustom?: number
  marginBottom: string
  marginBottomCustom?: number
  paddingTop?: string
  paddingTopCustom?: number
  paddingBottom?: string
  paddingBottomCustom?: number
  width: 'full' | 'container'
  backgroundColor: 'none' | 'va-lightgray' | 'va-white' | 'va-black'
}

const SPACING_MAP: Record<string, number> = {
  '0': 0,
  '8': 8,
  '16': 16,
  '24': 24,
  '32': 32,
  '48': 48,
  '64': 64,
}

function spacingToPx(value: string | undefined, custom?: number): number {
  if (!value) return 0
  if (value === 'custom' && custom != null) return custom
  return SPACING_MAP[value] ?? 0
}

/** Extract layout fields from block (supports flat projection or nested layout object). Uses stegaClean so Draft Mode encoding doesn't break spacing lookups. */
function getBlockLayout(block: Record<string, unknown>): Partial<BlockLayout> {
  const layout = block.layout as Record<string, unknown> | undefined
  return {
    marginTop: (cleanBlockValue(block.marginTop ?? layout?.marginTop) ?? '0') as string,
    marginTopCustom: (block.marginTopCustom ?? layout?.marginTopCustom) as number | undefined,
    marginBottom: (cleanBlockValue(block.marginBottom ?? layout?.marginBottom) ?? '0') as string,
    marginBottomCustom: (block.marginBottomCustom ?? layout?.marginBottomCustom) as number | undefined,
    paddingTop: (cleanBlockValue(block.paddingTop ?? layout?.paddingTop) ?? '0') as string,
    paddingTopCustom: (block.paddingTopCustom ?? layout?.paddingTopCustom) as number | undefined,
    paddingBottom: (cleanBlockValue(block.paddingBottom ?? layout?.paddingBottom) ?? '0') as string,
    paddingBottomCustom: (block.paddingBottomCustom ?? layout?.paddingBottomCustom) as number | undefined,
  }
}

export function getBlockContainerStyles(block: Record<string, unknown>): Record<string, string> {
  const layout = getBlockLayout(block)
  const marginTop = spacingToPx(layout.marginTop, layout.marginTopCustom)
  const marginBottom = spacingToPx(layout.marginBottom, layout.marginBottomCustom)
  const paddingTop = spacingToPx(layout.paddingTop, layout.paddingTopCustom)
  const paddingBottom = spacingToPx(layout.paddingBottom, layout.paddingBottomCustom)
  return {
    marginTop: `${marginTop}px`,
    marginBottom: `${marginBottom}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
  }
}

/** Shared container class with padding. Used for container-width blocks and page fallbacks. Side padding only below max width so centered layout is not double-inset. */
export const CONTAINER_CLASS =
  'max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0'

export function getBlockContainerWidthClass(block: Record<string, unknown>): string {
  const layout = block.layout as Record<string, unknown> | undefined
  const width = cleanBlockValue(block.width ?? layout?.width) ?? 'container'
  return width === 'full' ? 'w-full' : CONTAINER_CLASS
}

const BG_CLASS: Record<string, string> = {
  none: '',
  'va-lightgray': 'bg-va-lightgray',
  'va-white': 'bg-va-white',
  'va-black': 'bg-va-black',
}

export function getBlockBackgroundClass(block: Record<string, unknown>): string {
  const layout = block.layout as Record<string, unknown> | undefined
  const backgroundColor = (cleanBlockValue(block.backgroundColor ?? layout?.backgroundColor) ?? 'none') as string
  if (!backgroundColor || backgroundColor === 'none') return ''
  return BG_CLASS[backgroundColor] ?? ''
}

/** `id` for in-page navigation when **Section ID** is set in Layout in the CMS. */
export function getBlockSectionDomId(block: Record<string, unknown>): string | undefined {
  const layout = block.layout as Record<string, unknown> | undefined
  const raw = cleanBlockValue(
    (block.htmlAnchor as string | undefined) ?? (layout?.htmlAnchor as string | undefined)
  )
  const id = anchorIdFromString(raw)
  return id || undefined
}
