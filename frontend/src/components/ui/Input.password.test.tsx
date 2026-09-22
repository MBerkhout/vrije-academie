import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Input } from './Input'
import { ValidatedInput } from '@/components/auth/ValidatedInput'

describe('password visibility toggle', () => {
  it('toggles an Input password field between hidden and visible', () => {
    render(<Input label="Wachtwoord" type="password" defaultValue="geheim" />)

    const input = screen.getByLabelText('Wachtwoord')
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Toon wachtwoord' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Verberg wachtwoord' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Verberg wachtwoord' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('toggles a ValidatedInput password field', () => {
    render(
      <ValidatedInput
        name="password"
        label="Wachtwoord"
        type="password"
        value="geheim"
        onChange={() => {}}
        onBlur={() => {}}
        validity={{ state: 'idle' }}
      />
    )

    const input = screen.getByLabelText('Wachtwoord')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Toon wachtwoord' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('does not render a toggle on non-password inputs', () => {
    render(<Input label="E-mailadres" type="email" />)
    expect(screen.queryByRole('button', { name: 'Toon wachtwoord' })).toBeNull()
  })
})
