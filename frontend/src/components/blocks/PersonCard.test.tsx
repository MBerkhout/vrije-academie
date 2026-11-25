import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PersonCard } from './PersonCard'

vi.mock('@/components/cms/SanityImage', () => ({
  SanityImage: () => <div data-testid="sanity-image" />,
}))

describe('PersonCard', () => {
  it('hides bio until "Meer informatie" is pressed, then shows dialog', () => {
    render(
      <PersonCard
        person={{ name: 'Ada Lovelace', role: 'Docent', bio: 'Pioneer of computing.' }}
        showBio
        listingHref="/ons-aanbod?docent=ada"
        listingLabel="Bekijk alle activiteiten"
      />
    )
    expect(screen.queryByText('Pioneer of computing.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Meer informatie' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Pioneer of computing.')
    expect(screen.getByRole('link', { name: 'Bekijk alle activiteiten' })).toBeInTheDocument()
  })
})
