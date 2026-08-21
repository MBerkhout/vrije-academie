import { describe, expect, it } from 'vitest'
import {
  formatPdpGalleryCaption,
  formatPdpGalleryCaptionHtml,
  stripPdpGalleryCaptionHtml,
  toPdpGalleryImages,
} from './pdp-gallery-images'

describe('toPdpGalleryImages', () => {
  it('keeps captions aligned with urls and skips blanks', () => {
    expect(
      toPdpGalleryImages([
        { url: 'https://img/1.jpg', caption: 'Vermeer' },
        { url: '  ', caption: 'ignored' },
        { url: 'https://img/1.jpg', caption: 'duplicate' },
        { url: 'https://img/2.jpg', caption: '  Van Gogh  ' },
        'https://img/3.jpg',
      ])
    ).toEqual([
      { url: 'https://img/1.jpg', caption: 'Vermeer' },
      { url: 'https://img/2.jpg', caption: 'Van Gogh' },
      { url: 'https://img/3.jpg', caption: null },
    ])
  })
})

describe('formatPdpGalleryCaption', () => {
  it('splits composite credits on pipe', () => {
    expect(
      formatPdpGalleryCaption(
        'Johannes Vermeer, Meisje met de parel, 1665 | Vincent van Gogh, Portret van Joseph Roulin, 1889'
      )
    ).toBe(
      'Johannes Vermeer, Meisje met de parel, 1665\nVincent van Gogh, Portret van Joseph Roulin, 1889'
    )
  })
})

describe('formatPdpGalleryCaptionHtml', () => {
  it('renders emphasis tags and strips unsafe markup', () => {
    expect(
      formatPdpGalleryCaptionHtml(
        'Sandro Botticelli, <em>De geboorte van Venus</em>, ca. 1485. <script>x</script>'
      )
    ).toBe('Sandro Botticelli, <em>De geboorte van Venus</em>, ca. 1485. &lt;script&gt;x&lt;/script&gt;')
  })
})

describe('stripPdpGalleryCaptionHtml', () => {
  it('removes inline tags for alt text', () => {
    expect(stripPdpGalleryCaptionHtml('Sandro Botticelli, <em>De geboorte van Venus</em>, ca. 1485')).toBe(
      'Sandro Botticelli, De geboorte van Venus, ca. 1485'
    )
  })
})
