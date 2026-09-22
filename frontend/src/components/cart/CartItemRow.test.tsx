import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CartItem } from '@/lib/commerce/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import { CartItemRow } from './CartItemRow'

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const item: CartItem = {
  id: 'li1',
  variant_id: 'var_1',
  quantity: 1,
  unit_price: 2500,
  subtotal: 2500,
  total: 2500,
  title: 'College filosofie',
  variant: { id: 'var_1', title: 'Bundle', price: 2500, inventory_quantity: 1 },
}

function extras(overrides: Partial<CartItemExtras> = {}): CartItemExtras {
  return {
    line_item_id: 'li1',
    product_id: 'p1',
    product_handle: 'college-filosofie',
    product_title: 'College filosofie',
    thumbnail: null,
    event_item: null,
    vathuis: null,
    instructor_names: [],
    ...overrides,
  }
}

describe('CartItemRow quantity stepper', () => {
  it('hides +/- for VA Thuis lines', () => {
    render(
      <CartItemRow
        item={item}
        extras={extras({ is_vathuis: true })}
        updating={false}
        onQuantityChange={async () => {}}
        onRemove={async () => {}}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Minder' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Meer' })).not.toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('keeps +/- for ordinary session lines', () => {
    render(
      <CartItemRow
        item={item}
        extras={extras()}
        updating={false}
        onQuantityChange={async () => {}}
        onRemove={async () => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Minder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Meer' })).toBeInTheDocument()
  })

  it('shows the cadeaubon thumbnail for gift-card purchase lines', () => {
    render(
      <CartItemRow
        item={{
          ...item,
          title: 'Digitale cadeaubon',
          is_giftcard: true,
          metadata: { gift_card: { amount_cents: 5000 } },
        }}
        extras={extras({
          product_handle: 'digitale-cadeaubon',
          product_title: 'Digitale cadeaubon',
        })}
        updating={false}
        onQuantityChange={async () => {}}
        onRemove={async () => {}}
      />,
    )

    expect(screen.getByRole('img', { name: 'Digitale cadeaubon' })).toHaveAttribute(
      'src',
      '/branding/cadeaubon-thumb.jpg',
    )
  })
})
