import { beforeEach, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroBlock } from '../HeroBlock'
import type { HeroBlock as HeroBlockType } from '@/lib/cms'

const baseBlock: HeroBlockType = {
  _id: 'hero-1',
  _type: 'heroBlock',
  marginTop: '0',
  marginBottom: '0',
  width: 'container',
  backgroundColor: 'none',
  topPanelTitle: 'Top panel',
  slides: [],
}

describe('HeroBlock newsletter card', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID = '145840897'
  })

  it('shows Meld je aan when newsletterEnabled is unset', () => {
    render(<HeroBlock block={baseBlock} />)
    expect(screen.getByRole('heading', { name: 'Meld je aan' })).toBeInTheDocument()
  })

  it('shows Meld je aan when newsletterEnabled is true', () => {
    render(<HeroBlock block={{ ...baseBlock, newsletterEnabled: true }} />)
    expect(screen.getByRole('heading', { name: 'Meld je aan' })).toBeInTheDocument()
  })

  it('hides Meld je aan when newsletterEnabled is false', () => {
    render(<HeroBlock block={{ ...baseBlock, newsletterEnabled: false }} />)
    expect(screen.queryByRole('heading', { name: 'Meld je aan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Aanmelden' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Top panel' })).toBeInTheDocument()
  })

  it('embeds HubSpot newsletter form when form ID is set', () => {
    render(
      <HeroBlock
        block={{
          ...baseBlock,
          newsletterHubSpotFormId: 'b8d92c58-aca6-4807-a28a-f737a986f666',
        }}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Schrijf je hier in voor onze nieuwsbrief!' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Meld je aan' })).not.toBeInTheDocument()
    const embed = document.querySelector('.hs-form-html')
    expect(embed).toHaveAttribute('data-form-id', 'b8d92c58-aca6-4807-a28a-f737a986f666')
  })
})
