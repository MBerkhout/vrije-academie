import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EventInstructor } from '@/lib/commerce/types'
import { PdpFeaturedInstructor } from './PdpFeaturedInstructor'

const instructor: EventInstructor = {
  id: 'doc_1',
  slug: 'peter-van-duinen',
  name: 'Peter van Duinen',
  role: 'Directeur',
  photo_url: null,
  bio: 'Blablabla, tekst over Peter',
}

describe('PdpFeaturedInstructor', () => {
  it('renders the Salesforce teacher bio under name and role', () => {
    render(<PdpFeaturedInstructor instructor={instructor} variant="dark" />)

    expect(screen.getByRole('heading', { name: 'Docent' })).toBeInTheDocument()
    expect(screen.getByText('Peter van Duinen')).toBeInTheDocument()
    expect(screen.getByText('Directeur')).toBeInTheDocument()
    expect(screen.getByText('Blablabla, tekst over Peter')).toBeInTheDocument()
  })

  it('omits the bio paragraph when the teacher has no text', () => {
    render(
      <PdpFeaturedInstructor
        instructor={{ ...instructor, bio: '   ' }}
        variant="dark"
      />,
    )

    expect(screen.getByText('Peter van Duinen')).toBeInTheDocument()
    expect(screen.queryByText('Blablabla, tekst over Peter')).not.toBeInTheDocument()
  })
})
