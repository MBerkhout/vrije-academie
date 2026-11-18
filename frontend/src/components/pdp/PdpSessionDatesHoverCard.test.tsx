import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PdpSessionDatesHoverCard } from './PdpSessionDatesHoverCard'

const dates = [
  { start_at: '2027-01-28T13:00:00.000Z', end_at: '2027-01-28T15:00:00.000Z' },
  { start_at: '2027-02-04T13:00:00.000Z', end_at: '2027-02-04T15:00:00.000Z' },
]

describe('PdpSessionDatesHoverCard', () => {
  it('shows all dates in the tooltip when there are multiple sessions', () => {
    render(
      <PdpSessionDatesHoverCard dates={dates} primaryStartAt={dates[0].start_at}>
        <span>28 januari 2027</span>
      </PdpSessionDatesHoverCard>
    )

    fireEvent.focus(screen.getByRole('button', { name: /Alle lesdata/i }))

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Alle data')
    expect(tooltip.textContent).toMatch(/januari/)
    expect(tooltip.textContent).toMatch(/februari/)
  })

  it('renders plain text without hover for a single date', () => {
    render(
      <PdpSessionDatesHoverCard dates={[dates[0]]}>
        <span>Eén datum</span>
      </PdpSessionDatesHoverCard>
    )

    expect(screen.getByText('Eén datum')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})