import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewBlock } from '../ReviewBlock'
import type { ReviewBlock as ReviewBlockType } from '@/lib/cms'

const baseBlock: ReviewBlockType = {
  _id: 'rev-1',
  _type: 'reviewBlock',
  marginTop: '0',
  marginBottom: '0',
  width: 'container',
  backgroundColor: 'none',
  reviews: [
    { quote: 'First quote', authorName: 'A' },
    { quote: 'Second quote', authorName: 'B' },
  ],
}

describe('ReviewBlock', () => {
  it('shows prev/next when there are multiple reviews and navigationStyle is omitted', () => {
    render(<ReviewBlock block={{ ...baseBlock, navigationStyle: undefined }} />)
    expect(screen.getByText(/First quote/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next review' }))
    expect(screen.getByText(/Second quote/)).toBeInTheDocument()
  })

  it('shows dot navigation when navigationStyle is dots', () => {
    render(<ReviewBlock block={{ ...baseBlock, navigationStyle: 'dots' }} />)
    expect(screen.getByRole('button', { name: 'Go to review 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to review 2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next review' })).not.toBeInTheDocument()
  })
})
