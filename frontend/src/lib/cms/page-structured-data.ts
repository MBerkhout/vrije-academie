import {
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from '@/lib/json-ld'
import {
  resolveSeoDescription,
  resolveSeoImageUrl,
  resolveSeoTitle,
} from '@/lib/cms/seo-metadata'
import type { AccordionBlock, Block, Page } from '@/lib/cms/types'

type PortableTextChild = { text?: string }
type PortableTextBlockNode = {
  _type?: string
  children?: PortableTextChild[]
}

/** Extract plain text from Sanity portable text blocks for JSON-LD. */
export function portableTextToPlainText(blocks: unknown[] | undefined): string {
  if (!blocks?.length) return ''

  return blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const node = block as PortableTextBlockNode
      if (node._type !== 'block' || !Array.isArray(node.children)) return ''
      return node.children.map((child) => child.text ?? '').join('')
    })
    .join('\n')
    .trim()
}

function isAccordionBlock(block: Block): block is AccordionBlock {
  return block._type === 'accordionBlock'
}

/** Collect FAQ items from accordion blocks that allow structured data. */
export function extractFaqFromPageBlocks(blocks: Block[] | undefined) {
  if (!blocks?.length) return []

  return blocks.flatMap((block) => {
    if (!isAccordionBlock(block)) return []
    if (block.enableStructuredData === false) return []

    return (block.items ?? [])
      .map((item) => ({
        question: item.question?.trim() ?? '',
        answer: portableTextToPlainText(item.answer),
      }))
      .filter((item) => item.question && item.answer)
  })
}

/** Build WebPage (+ optional FAQPage) JSON-LD for CMS pages. */
export function buildCmsPageJsonLd(
  page: Pick<Page, 'title' | 'seo' | 'blocks'>,
  path: string,
): Record<string, unknown>[] {
  const name = resolveSeoTitle(page.seo, page.title) ?? page.title
  const description = resolveSeoDescription(page.seo) ?? undefined
  const image = resolveSeoImageUrl(page.seo) ?? undefined

  const schemas: Record<string, unknown>[] = [
    buildWebPageJsonLd({ name, description, url: path, image }),
  ]

  const faqItems = extractFaqFromPageBlocks(page.blocks)
  const faqSchema = buildFaqPageJsonLd(faqItems)
  if (faqSchema) schemas.push(faqSchema)

  return schemas
}
