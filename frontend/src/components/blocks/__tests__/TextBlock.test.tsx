import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextBlock } from '../TextBlock'
import type { TextBlock as TextBlockType } from '@/lib/cms'

const baseBlock: TextBlockType = {
  _id: 'text-1',
  _type: 'textBlock',
  marginTop: '0',
  marginBottom: '0',
  width: 'container',
  backgroundColor: 'none',
}

describe('TextBlock', () => {
  it('renders title when provided', () => {
    render(
      <TextBlock block={{ ...baseBlock, title: 'Test Title', titleSize: 'h2' }} />
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Title')
  })

  it('renders h1 when titleSize is h1', () => {
    render(
      <TextBlock block={{ ...baseBlock, title: 'Main Title', titleSize: 'h1' }} />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Title')
  })

  it('renders without title', () => {
    const { container } = render(
      <TextBlock block={{ ...baseBlock, content: [] }} />
    )
    expect(container.querySelector('h1, h2, h3, h4')).not.toBeInTheDocument()
  })

  it('applies BlockWrapper with layout', () => {
    const { container } = render(
      <TextBlock block={{ ...baseBlock, contentWidth: 'narrow' }} />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('max-w-[1240px]')
    const inner = wrapper.querySelector('.max-w-xl')
    expect(inner).toBeTruthy()
  })
})
