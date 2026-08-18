import { describe, expect, it } from 'vitest'
import { formatPdpGalleryCaption, toPdpGalleryImages } from './pdp-gallery-images'

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
