import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { EventCard, VathuisEpisode } from '@/lib/commerce/types'
import { PdpEpisodesTable } from './PdpEpisodesTable'

const push = vi.fn()
const addVariantToCart = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/lib/commerce/cart', () => ({
  addVariantToCart: (...args: unknown[]) => addVariantToCart(...args),
}))

vi.mock('@/lib/audience-player/runtime', () => ({
  preloadAudiencePlayer: vi.fn(),
}))

vi.mock('@/lib/commerce', () => ({
  commerceClient: {
    getVathuisPreviewPlayback: vi.fn().mockResolvedValue(null),
    getVathuisEpisodePlayback: vi.fn(),
  },
}))

const bundleVariant = {
  id: 'variant_bundle',
  title: 'Bundle',
  purchasable: true,
}

const lockedEpisode: VathuisEpisode = {
  number: 2,
  title: 'Locked lesson',
  duration_label: '12',
  preview_available: false,
}

const previewEpisode: VathuisEpisode = {
  number: 1,
  title: 'Preview lesson',
  duration_label: '8',
  preview_available: true,
}

function bundleEvent(overrides: Partial<EventCard> = {}): EventCard {
  return {
    id: 'prod_vathuis',
    handle: 'college-filosofie',
    title: 'College filosofie',
    purchase_mode: 'bundle_only',
    bundle_variant_id: bundleVariant.id,
    variants: [bundleVariant],
    ...overrides,
  }
}

describe('PdpEpisodesTable locked Koop alle lessen', () => {
  beforeEach(() => {
    push.mockReset()
    addVariantToCart.mockReset()
    addVariantToCart.mockResolvedValue(undefined)
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('shows duration under the episode title instead of a Duur column', () => {
    render(
      <PdpEpisodesTable
        event={bundleEvent()}
        productHandle="college-filosofie"
        episodes={[lockedEpisode]}
      />,
    )

    expect(screen.getByText('2. Locked lesson')).toBeInTheDocument()
    expect(screen.getByText('12 minuten')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Duur' })).not.toBeInTheDocument()
  })

  it('adds the bundle variant to the cart and goes to /winkelwagen', async () => {
    const event = bundleEvent()
    render(
      <PdpEpisodesTable
        event={event}
        productHandle={event.handle}
        episodes={[previewEpisode, lockedEpisode]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Koop alle lessen' }))

    await waitFor(() => {
      expect(addVariantToCart).toHaveBeenCalledWith(bundleVariant.id, {
        event,
        variant: bundleVariant,
      })
    })
    expect(push).toHaveBeenCalledWith('/winkelwagen')
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls to the booking panel when the bundle variant is missing', async () => {
    const event = bundleEvent({ bundle_variant_id: null, variants: [] })
    render(
      <div>
        <div id="booking-panel" />
        <PdpEpisodesTable
          event={event}
          productHandle={event.handle}
          episodes={[lockedEpisode]}
        />
      </div>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Koop alle lessen' }))

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    })
    expect(addVariantToCart).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})
