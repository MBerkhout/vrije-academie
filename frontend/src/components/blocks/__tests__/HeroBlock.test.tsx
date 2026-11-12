import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroBlock } from '../HeroBlock'
import type { HeroBlock as HeroBlockType } from '@/lib/cms'
import { HOMEPAGE_SR_ONLY_H1 } from '@/lib/cms/homepage-seo'

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

describe('HeroBlock sr-only site H1', () => {
  it('renders sr-only H1 when showHomepageSiteH1 is true', () => {
    render(<HeroBlock block={baseBlock} showHomepageSiteH1 />)
    expect(screen.getByRole('heading', { level: 1, hidden: true })).toHaveTextContent(
      HOMEPAGE_SR_ONLY_H1,
    )
  })

  it('does not render sr-only H1 by default', () => {
    render(<HeroBlock block={baseBlock} />)
    expect(
      screen.queryByRole('heading', { level: 1, hidden: true, name: HOMEPAGE_SR_ONLY_H1 }),
    ).not.toBeInTheDocument()
  })
})

describe('HeroBlock newsletter card', () => {
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

  it('opens newsletter popup trigger when legacy CTA ID is set', () => {
    render(
      <HeroBlock
        block={{
          ...baseBlock,
          newsletterHubSpotCtaId: '276896252118',
        }}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Schrijf je hier in voor onze nieuwsbrief!' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inschrijven' })).toBeInTheDocument()
  })
})
