import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PersonCard } from './PersonCard'

vi.mock('@/components/cms/SanityImage', () => ({
  SanityImage: () => <div data-testid="sanity-image" />,
}))

describe('PersonCard', () => {
  it('renders bio in hover overlay on desktop layout, not inline', () => {
    render(
      <PersonCard
        person={{ name: 'Ada Lovelace', role: 'Docent', bio: 'Pioneer of computing.' }}
        showBio
        listingLabel="Activiteiten"
      />
    )
    expect(screen.getByText('Pioneer of computing.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens mobile dialog when card is clicked on narrow viewports', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <PersonCard
        person={{ name: 'Ada Lovelace', bio: 'Pioneer of computing.' }}
        showBio
        listingLabel="Activiteiten"
      />
    )

    fireEvent.click(screen.getByRole('article'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('Pioneer of computing.').length).toBeGreaterThanOrEqual(1)

    vi.unstubAllGlobals()
  })
})