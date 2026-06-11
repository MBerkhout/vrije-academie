import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../index'
import type { Block } from '@/lib/cms'

vi.mock('../EventList', () => ({ EventList: () => <div data-testid="event-list">EventList</div> }))
vi.mock('../TextBlock', () => ({ TextBlock: ({ block }: { block: { _type: string } }) => <div data-testid="text-block">{block._type}</div> }))
vi.mock('../AfbeeldingBlock', () => ({ AfbeeldingBlock: () => <div data-testid="afbeelding-block">Afbeelding</div> }))
vi.mock('../WhitespaceBlock', () => ({ WhitespaceBlock: () => <div data-testid="whitespace-block">Whitespace</div> }))
vi.mock('../TabsBlock', () => ({ TabsBlock: () => <div data-testid="tabs-block">Tabs</div> }))
vi.mock('../FormBlock', () => ({ FormBlock: () => <div data-testid="form-block">Form</div> }))
vi.mock('../DemandNearbyBlock', () => ({ DemandNearbyBlock: () => <div data-testid="demand-nearby-block">DemandNearby</div> }))
vi.mock('../HeroBlock', () => ({ HeroBlock: () => <div data-testid="hero-block">Hero</div> }))
vi.mock('../ProductRowBlock', () => ({
  ProductRowBlock: () => <div data-testid="product-row-block">ProductRow</div>,
}))
vi.mock('../ProductRowBlockPersonalized', () => ({
  ProductRowBlockPersonalized: () => <div data-testid="product-row-personalized">ProductRowPersonalized</div>,
}))
vi.mock('../CategoriesBlock', () => ({ CategoriesBlock: () => <div data-testid="categories-block">Categories</div> }))
vi.mock('../UspBlock', () => ({ UspBlock: () => <div data-testid="usp-block">USP</div> }))
vi.mock('../ReviewBlock', () => ({ ReviewBlock: () => <div data-testid="review-block">Review</div> }))
vi.mock('../PersonsBlock', () => ({ PersonsBlock: () => <div data-testid="persons-block">Persons</div> }))
vi.mock('../ColumnsBlock', () => ({ ColumnsBlock: () => <div data-testid="columns-block">Columns</div> }))
vi.mock('../EditorialCardsBlock', () => ({
  EditorialCardsBlock: () => <div data-testid="editorial-cards-block">EditorialCards</div>,
}))

const baseBlock: Block = {
  _id: 'block-1',
  _type: 'textBlock',
  marginTop: '0',
  marginBottom: '0',
  width: 'container',
  backgroundColor: 'none',
}

describe('BlockRenderer', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('renders eventList block', () => {
    render(<BlockRenderer block={{ ...baseBlock, _type: 'eventList' } as Block} />)
    expect(screen.getByTestId('event-list')).toBeInTheDocument()
  })

  it('renders textBlock', () => {
    render(<BlockRenderer block={{ ...baseBlock, _type: 'textBlock' } as Block} />)
    expect(screen.getByTestId('text-block')).toBeInTheDocument()
  })

  it('renders afbeeldingBlock', () => {
    render(<BlockRenderer block={{ ...baseBlock, _type: 'afbeeldingBlock' } as Block} />)
    expect(screen.getByTestId('afbeelding-block')).toBeInTheDocument()
  })

  it('renders whitespaceBlock', () => {
    render(<BlockRenderer block={{ ...baseBlock, _type: 'whitespaceBlock' } as Block} />)
    expect(screen.getByTestId('whitespace-block')).toBeInTheDocument()
  })

  it('renders formBlock', () => {
    render(<BlockRenderer block={{ ...baseBlock, _type: 'formBlock' } as Block} />)
    expect(screen.getByTestId('form-block')).toBeInTheDocument()
  })

  it('renders heroBlock', () => {
    render(<BlockRenderer block={{ ...baseBlock, _type: 'heroBlock' } as Block} />)
    expect(screen.getByTestId('hero-block')).toBeInTheDocument()
  })

  it('renders productRowBlock (server)', () => {
    render(
      <BlockRenderer block={{ ...baseBlock, _type: 'productRowBlock', sourceType: 'handpicked' } as Block} />,
    )
    expect(screen.getByTestId('product-row-block')).toBeInTheDocument()
  })

  it('renders productRowBlock (personalized)', () => {
    render(
      <BlockRenderer block={{ ...baseBlock, _type: 'productRowBlock', sourceType: 'personalized' } as Block} />,
    )
    expect(screen.getByTestId('product-row-personalized')).toBeInTheDocument()
  })

  it('renders editorialCardsBlock', () => {
    render(<BlockRenderer block={{ ...baseBlock, _type: 'editorialCardsBlock' } as Block} />)
    expect(screen.getByTestId('editorial-cards-block')).toBeInTheDocument()
  })

  it('returns null and warns for unknown block type', () => {
    const { container } = render(
      <BlockRenderer block={{ ...baseBlock, _type: 'unknownBlock' } as Block} />
    )
    expect(container.firstChild).toBeNull()
    expect(console.warn).toHaveBeenCalledWith('Unknown block type: unknownBlock')
  })
})
