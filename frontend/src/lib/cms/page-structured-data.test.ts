import { describe, expect, it } from 'vitest'
import { buildCmsPageJsonLd, extractFaqFromPageBlocks } from './page-structured-data'
import type { Block } from './types'

describe('page-structured-data', () => {
  it('extractFaqFromPageBlocks respects enableStructuredData', () => {
    const blocks = [
      {
        _id: 'a1',
        _type: 'accordionBlock',
        marginTop: '0',
        marginBottom: '0',
        width: 'container',
        backgroundColor: 'none',
        items: [
          {
            question: 'Wat kost het?',
            answer: [{ _type: 'block', children: [{ _type: 'span', text: 'Vanaf €50.' }] }],
          },
        ],
      },
      {
        _id: 'a2',
        _type: 'accordionBlock',
        marginTop: '0',
        marginBottom: '0',
        width: 'container',
        backgroundColor: 'none',
        enableStructuredData: false,
        items: [
          {
            question: 'Hidden?',
            answer: [{ _type: 'block', children: [{ _type: 'span', text: 'No' }] }],
          },
        ],
      },
    ] as Block[]

    expect(extractFaqFromPageBlocks(blocks)).toEqual([
      { question: 'Wat kost het?', answer: 'Vanaf €50.' },
    ])
  })

  it('buildCmsPageJsonLd emits WebPage and FAQPage', () => {
    const schemas = buildCmsPageJsonLd(
      {
        title: 'Vragen',
        seo: { metaDescription: 'Antwoorden op veelgestelde vragen.' },
        blocks: [
          {
            _id: 'a1',
            _type: 'accordionBlock',
            marginTop: '0',
            marginBottom: '0',
            width: 'container',
            backgroundColor: 'none',
            items: [
              {
                question: 'Hoe meld ik me aan?',
                answer: [{ _type: 'block', children: [{ _type: 'span', text: 'Via de website.' }] }],
              },
            ],
          },
        ] as Block[],
      },
      '/vragen',
    )

    expect(schemas).toHaveLength(2)
    expect(schemas[0]['@type']).toBe('WebPage')
    expect(schemas[1]['@type']).toBe('FAQPage')
  })
})
