import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortableText } from './PortableText'

function bulletBlocks(texts: string[]) {
  return texts.map((text, i) => ({
    _type: 'block',
    _key: `b${i}`,
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: `s${i}`, text, marks: [] }],
    markDefs: [],
  }))
}

function numberBlocks(texts: string[]) {
  return texts.map((text, i) => ({
    _type: 'block',
    _key: `n${i}`,
    style: 'normal',
    listItem: 'number',
    level: 1,
    children: [{ _type: 'span', _key: `ns${i}`, text, marks: [] }],
    markDefs: [],
  }))
}

describe('PortableText lists', () => {
  it('keeps bullet markers outside wrapping text', () => {
    const { container } = render(
      <PortableText
        value={bulletBlocks([
          'Een lange regel die op mobiel over meerdere regels valt zonder onder het bolletje te schuiven.',
          'Tweede punt.',
        ])}
      />,
    )

    const list = container.querySelector('ul')
    expect(list).toBeTruthy()
    expect(list).toHaveClass('list-outside', 'list-disc', 'ps-6')
    expect(list).not.toHaveClass('list-inside')
    expect(screen.getByText('Tweede punt.')).toBeInTheDocument()
  })

  it('keeps numbered markers outside wrapping text', () => {
    const { container } = render(
      <PortableText value={numberBlocks(['Eerste stap met extra uitleg op een smalle viewport.', 'Tweede stap.'])} />,
    )

    const list = container.querySelector('ol')
    expect(list).toBeTruthy()
    expect(list).toHaveClass('list-outside', 'list-decimal', 'ps-6')
    expect(list).not.toHaveClass('list-inside')
  })
})
