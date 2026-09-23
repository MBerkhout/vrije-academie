import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { PaymentProvider } from '@/lib/commerce/types'
import { PaymentMethodTiles } from './PaymentMethodTiles'

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

function provider(id: string): PaymentProvider {
  return { id, is_enabled: true }
}

describe('PaymentMethodTiles', () => {
  it('hides Mollie hosted checkout because every other method already pays via Mollie', () => {
    render(
      <PaymentMethodTiles
        providers={[
          provider('pp_mollie-hosted-checkout_mollie'),
          provider('pp_mollie-ideal_mollie'),
          provider('pp_system_default'),
          provider('pp_mollie-card_mollie'),
        ]}
        selected="pp_mollie-ideal_mollie"
        onSelect={() => {}}
      />
    )

    expect(screen.queryByText('Mollie Checkout')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /iDEAL/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Creditcard/i })).toBeInTheDocument()
  })
})
