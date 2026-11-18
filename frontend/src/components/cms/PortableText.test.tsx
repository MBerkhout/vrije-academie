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

describe('PortableText links', () => {
  it('renders link marks combined with underline decorator', () => {
    const { container } = render(
      <PortableText
        value={[
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            listItem: 'bullet',
            level: 1,
            children: [
              { _key: 'k2', _type: 'span', marks: ['249a99c1cc2e', 'underline'], text: 'Rembrandt 1656' },
              { _key: 'x', _type: 'span', marks: ['underline'], text: ':' },
            ],
            markDefs: [{ _key: '249a99c1cc2e', _type: 'link', href: '/podcast-rembrandt-1656' }],
          },
        ]}
      />,
    )

    expect(container.querySelector('a[href="/podcast-rembrandt-1656"]')).toBeTruthy()
  })

  it('renders internal and external link marks', () => {
    const { container } = render(
      <PortableText
        value={[
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            children: [{ _type: 'span', _key: 's1', text: 'Rembrandt', marks: ['l1'] }],
            markDefs: [{ _key: 'l1', _type: 'link', href: '/podcast-rembrandt-1656' }],
          },
          {
            _type: 'block',
            _key: 'b2',
            style: 'normal',
            children: [{ _type: 'span', _key: 's2', text: 'Spotify', marks: ['l2'] }],
            markDefs: [
              { _key: 'l2', _type: 'link', href: 'https://open.spotify.com/show/test' },
            ],
          },
        ]}
      />,
    )

    const internal = container.querySelector('a[href="/podcast-rembrandt-1656"]')
    const external = container.querySelector('a[href="https://open.spotify.com/show/test"]')
    expect(internal).toBeTruthy()
    expect(external).toHaveAttribute('target', '_blank')
  })
})

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
