import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { isExistingAccountError, LoginForm } from './LoginForm'

const register = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/commerce', () => ({
  commerceClient: {
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
    customerLookup: vi.fn(),
  },
}))

vi.mock('@/lib/commerce/CustomerProvider', () => ({
  useCustomer: () => ({
    customer: null,
    loading: false,
    login: vi.fn(),
    register,
    refresh: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/lib/address/usePdokAddressLookup', () => ({
  usePdokAddressLookup: () => ({
    addressLookup: 'error',
    setAddressLookup: vi.fn(),
  }),
}))

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function completeRegisterSteps() {
  fireEvent.click(screen.getByRole('button', { name: 'Account aanmaken' }))

  fill('Voornaam *', 'Jan')
  fill('Achternaam *', 'Jansen')
  fill('E-mailadres *', 'bestaat@example.com')
  fill('Wachtwoord *', 'wachtwoord1')
  fill('Wachtwoord bevestigen *', 'wachtwoord1')
  fireEvent.click(screen.getByRole('button', { name: 'Volgende' }))

  await screen.findByText('Stap 2 van 3 — Adresgegevens')
  fill('Postcode *', '1012 JS')
  fill('Huisnummer *', '10')
  fireEvent.click(screen.getByRole('button', { name: 'Klik hier om handmatig in te vullen' }))
  fill('Straat *', 'Kalverstraat')
  fill('Stad *', 'Amsterdam')
  fireEvent.click(screen.getByRole('button', { name: 'Volgende' }))

  await screen.findByText('Stap 3 van 3 — Controleer je gegevens')
}

function accountCreateSubmit() {
  return screen
    .getAllByRole('button', { name: 'Account aanmaken' })
    .find((el) => (el as HTMLButtonElement).type === 'submit')
}

describe('isExistingAccountError', () => {
  it('detects Medusa identity-exists errors', () => {
    expect(isExistingAccountError(new Error('Identity with email already exists'))).toBe(true)
    expect(isExistingAccountError(new Error('An account with this email already exists'))).toBe(true)
    expect(isExistingAccountError(new Error('Network error'))).toBe(false)
  })
})

describe('LoginForm existing-email registration', () => {
  it('disables Account aanmaken and links to login when the email is taken', async () => {
    register.mockRejectedValueOnce(new Error('Identity with email already exists'))

    render(<LoginForm settings={{}} />)
    await completeRegisterSteps()

    fireEvent.click(accountCreateSubmit()!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'klik hier' })).toBeInTheDocument()
    })
    expect(screen.getByText(/Er bestaat al een account met dit e-mailadres/)).toBeInTheDocument()
    expect(screen.getByText(/om in te loggen/)).toBeInTheDocument()
    expect(accountCreateSubmit()).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'klik hier' }))

    expect(screen.getByRole('button', { name: 'Volgende' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mailadres')).toHaveValue('bestaat@example.com')
  })

  it('keeps Account aanmaken enabled on a generic register failure', async () => {
    register.mockRejectedValueOnce(new Error('Registration succeeded but login failed'))

    render(<LoginForm settings={{}} />)
    await completeRegisterSteps()

    fireEvent.click(accountCreateSubmit()!)

    await waitFor(() => {
      expect(screen.getByText('Registreren mislukt. Probeer het opnieuw.')).toBeInTheDocument()
    })
    expect(accountCreateSubmit()).not.toBeDisabled()
    expect(screen.queryByRole('button', { name: 'klik hier' })).not.toBeInTheDocument()
  })
})
