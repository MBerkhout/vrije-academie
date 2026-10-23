import { describe, expect, it } from 'vitest'
import { sanityImageSrc } from './image-url'

const portraitSource = {
  _type: 'image' as const,
  asset: {
    _type: 'reference' as const,
    _ref: 'image-abc123-183x275-jpg',
  },
}

const hotspotSource = {
  ...portraitSource,
  hotspot: { x: 0.5, y: 0.15, width: 0.4, height: 0.35 },
}

function params(url: string) {
  return new URL(url).searchParams
}

describe('sanityImageSrc', () => {
  it('uses CDN crop for fill + cover with aspect ratio (hotspot-aware)', () => {
    const url = sanityImageSrc(portraitSource, {
      fill: true,
      cropAspect: 'aspect-video',
    })
    const q = params(url)
    expect(q.get('w')).toBe('1200')
    expect(q.get('h')).toBe('675')
    expect(q.get('fit')).toBe('crop')
    expect(q.get('auto')).toBe('format')
    expect(q.get('q')).toBe('80')
  })

  it('applies hotspot when cropping', () => {
    const url = sanityImageSrc(hotspotSource, {
      fill: true,
      cropAspect: 'aspect-video',
    })
    const q = params(url)
    expect(q.get('fit')).toBe('crop')
    expect(q.get('rect')).not.toBeNull()
  })

  it('does not force a 16:9 crop for contain', () => {
    const url = sanityImageSrc(portraitSource, { objectFit: 'contain' })
    const q = params(url)
    expect(q.get('h')).toBeNull()
    expect(q.get('rect')).toBeNull()
    expect(q.get('fit')).toBe('max')
  })

  it('does not crop contain when layout width and height are set', () => {
    const url = sanityImageSrc(portraitSource, { objectFit: 'contain', width: 183, height: 275 })
    const q = params(url)
    expect(q.get('h')).toBeNull()
    expect(q.get('rect')).toBeNull()
    expect(q.get('fit')).toBe('max')
  })

  it('crops to an explicit width×height box when both are set', () => {
    const url = sanityImageSrc(portraitSource, { width: 75, height: 90, fill: true })
    const q = params(url)
    expect(q.get('w')).toBe('75')
    expect(q.get('h')).toBe('90')
    expect(q.get('fit')).toBe('crop')
  })

  it('crops cover (non-fill) to the default 16:9 box', () => {
    const url = sanityImageSrc(portraitSource)
    const q = params(url)
    expect(q.get('w')).toBe('1200')
    expect(q.get('h')).toBe('675')
    expect(q.get('fit')).toBe('crop')
  })
})
