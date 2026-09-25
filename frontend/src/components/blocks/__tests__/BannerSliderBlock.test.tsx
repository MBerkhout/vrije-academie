import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BannerSliderBlock } from '../BannerSliderBlock'
import type { BannerSliderBlock as BannerSliderBlockType } from '@/lib/cms'

vi.mock('@/components/cms/SanityImage', () => ({
  SanityImage: () => <div data-testid="sanity-image" />,
}))

const slideImage = {
  asset: { _ref: 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg' },
}

const baseBlock: BannerSliderBlockType = {
  _id: 'banner-1',
  _type: 'bannerSliderBlock',
  marginTop: '0',
  marginBottom: '0',
  width: 'full',
  backgroundColor: 'none',
  slides: [
    {
      backgroundImage: slideImage,
      title: 'Banner title',
      overlayOpacity: 'medium',
      contentAlignment: 'left',
    },
    {
      backgroundImage: slideImage,
      title: 'Second slide',
      overlayOpacity: 'medium',
      contentAlignment: 'left',
    },
  ],
}

describe('BannerSliderBlock', () => {
  it('renders a fixed 400px full-width stage with h2 title', () => {
    const { container } = render(<BannerSliderBlock block={baseBlock} />)
    const stage = container.querySelector('.h-\\[400px\\].w-full')
    expect(stage).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Banner title' })).toBeInTheDocument()
  })

  it('shows slide navigation when there are multiple slides', () => {
    render(<BannerSliderBlock block={baseBlock} />)
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeInTheDocument()
  })
})
