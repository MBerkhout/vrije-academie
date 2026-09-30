import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EventInstructor } from '@/lib/commerce/types'
import { PdpInstructorHoverCard } from './PdpInstructorHoverCard'

const instructor: EventInstructor = {
  id: 'doc_1',
  slug: 'krzysztof-dobrowolski-onclin',
  name: 'Drs. Krzysztof Dobrowolski-Onclin',
  role: 'Docent',
  photo_url: null,
  bio: 'Ook kent Krzysztof Museum Catharijneconvent en het Rijksmuseum op z&#39;n duimpje.',
}

describe('PdpInstructorHoverCard', () => {
  it('shows a decoded apostrophe in the hover bio', () => {
    render(<PdpInstructorHoverCard name="Krzysztof Dobrowolski-Onclin" instructor={instructor} />)

    fireEvent.focus(screen.getByRole('button', { name: /Krzysztof/ }))

    expect(screen.getByRole('tooltip')).toHaveTextContent("op z'n duimpje")
    expect(screen.getByRole('tooltip')).not.toHaveTextContent('&#39;')
  })
})
